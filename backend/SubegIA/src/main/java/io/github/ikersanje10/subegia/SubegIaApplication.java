package io.github.ikersanje10.subegia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;

import io.github.ikersanje10.subegia.assessment.infraestructure.config.WeatherGridProperties;

@SpringBootApplication
@EnableConfigurationProperties(WeatherGridProperties.class)
@EnableCaching
public class SubegIaApplication {
    public static void main(String[] args) {
        SpringApplication.run(SubegIaApplication.class, args);
    }
}
