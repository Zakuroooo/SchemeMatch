package in.schemematch.api.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** The Fastify tests in apps/api/test/app.test.ts and profile-schema.test.ts, ported. */
@SpringBootTest(properties = "schemematch.rate-limit-per-minute=100000")
@AutoConfigureMockMvc
class SchemeRoutesTest {

    static final String SUNITA = """
            {"state":"MH","gender":"female","age":38,"marital_status":"widow",
             "annual_family_income":60000,"has_bpl_card":true,"children_count":2,
             "is_pregnant_or_lactating":false,"disability_percent":0,"land_acres":0,
             "caste_category":"OBC"}""";

    @Autowired
    MockMvc mvc;

    private ResultActions eligibility(String body) throws Exception {
        return mvc.perform(post("/eligibility").contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions profile(String profile) throws Exception {
        return eligibility("{\"profile\":" + profile + "}");
    }

    @Test
    void health() throws Exception {
        mvc.perform(get("/health")).andExpect(status().isOk())
                .andExpect(content().json("{\"ok\":true}"));
    }

    @Test
    void listsAll30SchemesWithoutRules() throws Exception {
        mvc.perform(get("/schemes")).andExpect(status().isOk())
                .andExpect(jsonPath("$.schemes", hasSize(30)))
                .andExpect(jsonPath("$.schemes[0].official_url").exists())
                .andExpect(jsonPath("$.schemes[0].eligibility").doesNotExist());
    }

    @Test
    void filtersToCentralPlusOneState() throws Exception {
        mvc.perform(get("/schemes?state=WB"))
                .andExpect(jsonPath("$.schemes[*].state",
                        everyItem(anyOf(nullValue(), is("WB")))))
                .andExpect(jsonPath("$.schemes[*].state", hasItem("WB")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"state=westbengal", "state=", "state=wb", "name=Sunita",
        "state=WB&state=MH"})
    void refusesABadQuery(String query) throws Exception {
        mvc.perform(get("/schemes?" + query)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(content().string(not(org.hamcrest.Matchers.containsString("Sunita"))));
    }

    @Test
    void givesSunitaHerElevenSchemes() throws Exception {
        profile(SUNITA).andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible[*].slug", containsInAnyOrder("apy", "e-shram",
                        "mh-ladki-bahin", "mh-sanjay-gandhi-niradhar", "nfbs", "pm-sym",
                        "pm-vishwakarma", "pmjdy", "pmjjby", "pmsby", "pmuy")))
                .andExpect(jsonPath("$.eligible[?(@.slug=='mh-ladki-bahin')].reasons[*]",
                        hasItem("with an annual family income of less than ₹2.5 lakh")))
                .andExpect(jsonPath("$.need_info", hasSize(0)))
                .andExpect(jsonPath("$.disclaimer").value(EligibilityResponse.DISCLAIMER));
    }

    @Test
    void showsOnlyRealReasonsAndRequirements() throws Exception {
        String sg = "$.eligible[?(@.slug=='mh-sanjay-gandhi-niradhar')]";
        profile(SUNITA)
                .andExpect(jsonPath(sg + ".reasons[*]", hasItem("Destitute widows")))
                .andExpect(jsonPath(sg + ".reasons[*]",
                        not(hasItem("divorced women not receiving alimony"))))
                .andExpect(jsonPath(sg + ".also_confirm[*]", not(hasItem("Orphaned children"))));
    }

    @Test
    void explainsOtherStatesOtherWaysAndTheClosestMiss() throws Exception {
        profile(SUNITA)
                .andExpect(jsonPath("$.not_eligible[?(@.slug=='wb-annapurna')].other_state",
                        hasItem(true)))
                .andExpect(jsonPath("$.not_eligible[?(@.slug=='pmmvy')].other_state",
                        hasItem(false)))
                .andExpect(jsonPath("$.not_eligible[?(@.slug=='pmmvy')].other_ways[*]",
                        hasItem("Holds an e-Shram card")))
                .andExpect(jsonPath("$.not_eligible[?(@.slug=='ignwps')].closest_miss",
                        hasItem("A widow in age group of 40 to 79 years")));
    }

    @Test
    void asksANextQuestionWhenTheProfileIsEmpty() throws Exception {
        profile("{}").andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible", hasSize(0)))
                .andExpect(jsonPath("$.next_question").value("age"));
    }

    @Test
    void nextQuestionIsAnExplicitNullWhenNothingIsMissing() throws Exception {
        profile(SUNITA).andExpect(content().string(
                org.hamcrest.Matchers.containsString("\"next_question\":null")));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"profile\":{\"age\":30,\"name\":\"Sunita\"}}",
        "{\"profile\":{\"age\":\"38\"}}",
        "{\"profile\":{},\"phone\":\"9999999999\"}",
        "{}", "", "[]", "null", "{\"profile\":null}", "{\"profile\":\"Sunita\"}"
    })
    void refusesABadBodyAndNeverEchoesValues(String body) throws Exception {
        String answer = eligibility(body).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("The request is not valid."))
                .andExpect(jsonPath("$.error.details[0].message").exists())
                .andReturn().getResponse().getContentAsString();
        assertThat(answer).doesNotContain("Sunita").doesNotContain("9999999999")
                .doesNotContain("38");
    }

    @ParameterizedTest
    @ValueSource(strings = {"name", "phone", "aadhaar", "address", "email"})
    void refusesIdentifyingFields(String key) throws Exception {
        profile("{\"age\":30,\"" + key + "\":\"x\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].path").value("/profile"));
    }

    @ParameterizedTest(name = "{0} = {1}")
    @CsvSource(quoteCharacter = '`', value = {
        "age,38.5", "age,150", "age,-1", "age,true", "age,\"\"",
        "annual_family_income,-1", "annual_family_income,1e400", "annual_family_income,\"5\"",
        "gender,\"unknown\"", "gender,5", "state,\"mh\"", "state,\"MH\\n\"",
        "disability_percent,140", "education_level,\"class_13\"", "district,\"x\"",
        "district,12", "occupation,false", "is_student,1", "is_student,\"true\"",
        "household_size,0", "children_count,31", "land_acres,100001", "caste_category,\"sc\"",
        "marital_status,\"Widow\""
    })
    void refusesAWrongValueAndNamesTheField(String field, String value) throws Exception {
        profile("{\"" + field + "\":" + value + "}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details[0].path").value("/profile/" + field));
    }

    /** PostgreSQL cannot store a NUL character or half of a surrogate pair. */
    @ParameterizedTest
    @CsvSource({"district,ab\\u0000cd", "occupation,ab\\u0000cd",
        "district,ab\\ud800cd", "occupation,ab\\ud800cd"})
    void refusesTextTheDatabaseCannotStore(String field, String value) throws Exception {
        profile("{\"" + field + "\":\"" + value + "\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details[0].path").value("/profile/" + field));
    }

    @Test
    void acceptsIndianScriptsAndEmoji() throws Exception {
        profile("{\"district\":\"पुणे\",\"occupation\":\"শিক্ষক 😀\"}").andExpect(status().isOk());
    }

    @Test
    void acceptsEveryFieldAtOnce() throws Exception {
        profile("""
                {"state":"MH","district":"Pune","age":120,"gender":"other",
                 "marital_status":"abandoned","annual_family_income":0.5,"caste_category":"EWS",
                 "occupation":"farmer","land_acres":2.5,"disability_percent":100,
                 "is_student":true,"education_level":"class_12","household_size":50,
                 "has_bpl_card":false,"children_count":0,"is_pregnant_or_lactating":true}""")
                .andExpect(status().isOk());
    }

    /** A known difference: the Fastify API answers 400 to an explicit null. */
    @Test
    void nullMeansNotAnswered() throws Exception {
        profile("{\"age\":null}").andExpect(status().isOk())
                .andExpect(jsonPath("$.next_question").value("age"));
    }

    @Test
    void brokenJsonIs400() throws Exception {
        eligibility("{\"profile\":{\"district\":\"Zz").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_JSON"));
    }

    @Test
    void hugeBodyIs413() throws Exception {
        profile("{\"district\":\"" + "x".repeat(1_100_000) + "\"}")
                .andExpect(status().is(413))
                .andExpect(jsonPath("$.error.code").value("BODY_TOO_LARGE"));
    }

    @Test
    void wrongContentTypeIs415() throws Exception {
        mvc.perform(post("/eligibility").contentType(MediaType.TEXT_PLAIN).content("hi"))
                .andExpect(status().is(415))
                .andExpect(jsonPath("$.error.code").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void unknownRouteAndWrongMethodAre404() throws Exception {
        String body = "{\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"No such route.\"}}";
        mvc.perform(get("/nope")).andExpect(status().isNotFound())
                .andExpect(content().string(body));
        mvc.perform(put("/eligibility")).andExpect(status().isNotFound())
                .andExpect(content().string(body));
    }
}
