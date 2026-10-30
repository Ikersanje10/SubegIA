package io.github.ikersanje10.subegia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.WeatherGridProperties;

@SpringBootApplication
@EnableConfigurationProperties(WeatherGridProperties.class)
public class SubegIaApplication {
    public static void main(String[] args) {
        SpringApplication.run(SubegIaApplication.class, args);
    }
}
