package in.schemematch.api.service;

/** The server runs without a database, so nothing can be saved or deleted. */
public class StorageUnavailableException extends RuntimeException {
    public StorageUnavailableException() {
        super("Saving screenings is not set up on this server yet.");
    }
}
