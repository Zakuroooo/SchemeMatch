package in.schemematch.api.web;

import static org.assertj.core.api.Assertions.assertThat;

import in.schemematch.api.config.AppProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/** A plain JUnit test: the filter is built by hand, no Spring is started. */
class RateLimitFilterTest {

    private static final Instant START = Instant.parse("2026-11-25T10:00:00Z");
    private final JsonMapper json = JsonMapper.builder().build();

    private RateLimitFilter filter(int limit, String ipHeader, Clock clock) {
        return new RateLimitFilter(
                new AppProperties(limit, ipHeader, "", List.of()), clock, json);
    }

    private RateLimitFilter filter(int limit, String ipHeader) {
        return filter(limit, ipHeader, Clock.fixed(START, ZoneOffset.UTC));
    }

    private MockHttpServletResponse hit(RateLimitFilter filter, String header, String ip)
            throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        if (header != null) request.addHeader(header, ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    void blocksAfterTheAllowedNumber() throws Exception {
        RateLimitFilter f = filter(3, "");
        for (int i = 0; i < 3; i++) assertThat(hit(f, null, null).getStatus()).isEqualTo(200);
        MockHttpServletResponse blocked = hit(f, null, null);
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("retry-after")).isEqualTo("60");
        assertThat(blocked.getContentAsString()).isEqualTo("{\"error\":{\"code\":\"RATE_LIMITED\","
                + "\"message\":\"Too many requests. Try again in 60 seconds.\"}}");
    }

    @Test
    void aNewMinuteStartsANewCount() throws Exception {
        Instant[] now = {START};
        Clock clock = new Clock() {
            @Override
            public ZoneOffset getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(java.time.ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return now[0];
            }
        };
        RateLimitFilter f = filter(1, "", clock);
        assertThat(hit(f, null, null).getStatus()).isEqualTo(200);
        now[0] = START.plusSeconds(59);
        assertThat(hit(f, null, null).getStatus()).isEqualTo(429);
        now[0] = START.plusSeconds(60);
        assertThat(hit(f, null, null).getStatus()).isEqualTo(200);
    }

    @Test
    void ignoresClientIpHeadersUnlessConfigured() throws Exception {
        RateLimitFilter f = filter(1, "");
        assertThat(hit(f, "x-forwarded-for", "1.1.1.1").getStatus()).isEqualTo(200);
        assertThat(hit(f, "x-forwarded-for", "2.2.2.2").getStatus()).isEqualTo(429);
    }

    @Test
    void eachRealClientHasItsOwnCountBehindAProxy() throws Exception {
        RateLimitFilter f = filter(1, "x-real-ip");
        assertThat(hit(f, "x-real-ip", "1.1.1.1").getStatus()).isEqualTo(200);
        assertThat(hit(f, "x-real-ip", "2.2.2.2").getStatus()).isEqualTo(200);
        assertThat(hit(f, "x-real-ip", "1.1.1.1").getStatus()).isEqualTo(429);
    }

    @Test
    void fortyRequestsAtTheSameMomentLetExactlyTenThrough() throws Exception {
        RateLimitFilter f = filter(10, "");
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(40);
        try {
            List<Future<Integer>> results = IntStream.range(0, 40).mapToObj(i -> pool.submit(() -> {
                go.await();
                return hit(f, null, null).getStatus();
            })).toList();
            go.countDown();
            int passed = 0;
            for (Future<Integer> r : results) if (r.get() == 200) passed++;
            assertThat(passed).isEqualTo(10);
        } finally {
            pool.shutdownNow();
        }
    }
}
