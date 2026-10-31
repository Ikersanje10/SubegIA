package io.github.ikersanje10.subegia.assessment.infraestructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient openMeteoRestClient(RestClient.Builder builder) {
        return builder
                .baseUrl("https://historical-forecast-api.open-meteo.com")
                .build();
    }
}
