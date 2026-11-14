package com.bantads.ms_auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class MsAuthApplicationTests {

    @Test
    void deveExporClassePrincipalDoMicrosservico() {
        assertNotNull(MsAuthApplication.class);
    }
}
