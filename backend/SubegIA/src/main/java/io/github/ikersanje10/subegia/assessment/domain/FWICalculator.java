package io.github.ikersanje10.subegia.assessment.domain;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class FWICalculator {

    // Van Wagner/Pickett FWI system; monthly factors for latitudes >= 30 N.
    private static final double[] DMC_DAY_LENGTH = {
            6.5, 7.5, 9.0, 12.8, 13.9, 13.9, 12.4, 10.9, 9.4, 8.0, 7.0, 6.0
    };
    private static final double[] DC_SEASONAL_FACTOR = {
            -1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5.0, 2.4, 0.4, -1.6, -1.6
    };
    private static final double FFMC_MOISTURE_COEFFICIENT = 250.0 * 59.5 / 101.0;

    public FWIResult calculateDay(DailyWeather weather, FWIMoistureState previous) {
        if (weather == null || previous == null) {
            throw new IllegalArgumentException("Daily weather and previous FWI moisture states are required.");
        }
        if (!previous.date().plusDays(1).equals(weather.date())) {
            throw new IllegalArgumentException("FWI requires moisture states from the immediately preceding day.");
        }

        double ffmc = calculateFFMC(weather, previous.ffmc());
        double dmc = calculateDMC(weather, previous.dmc());
        double dc = calculateDC(weather, previous.dc());
        FWIMoistureState state = new FWIMoistureState(weather.date(), ffmc, dmc, dc);
        double isi = calculateISI(ffmc, weather.windSpeedKmh());
        double bui = calculateBUI(dmc, dc);
        return new FWIResult(weather, state, isi, bui, calculateFWI(isi, bui));
    }

    public List<FWIResult> calculateSeries(List<DailyWeather> weather, FWIMoistureState initial) {
        if (weather == null || weather.isEmpty() || initial == null) {
            throw new IllegalArgumentException("A nonempty daily weather series and initial moisture states are required.");
        }

        List<FWIResult> results = new ArrayList<>(weather.size());
        FWIMoistureState previous = initial;
        Double latitude = null;
        for (DailyWeather day : weather) {
            if (day == null) {
                throw new IllegalArgumentException("Daily weather series must not contain null entries.");
            }
            if (latitude != null && Double.compare(latitude, day.latitude()) != 0) {
                throw new IllegalArgumentException("A FWI series must use one source location's latitude.");
            }
            latitude = day.latitude();
            FWIResult result = calculateDay(day, previous);
            results.add(result);
            previous = result.moistureState();
        }
        return List.copyOf(results);
    }

    private double calculateFFMC(DailyWeather weather, double previous) {
        double moisture = FFMC_MOISTURE_COEFFICIENT * (101 - previous) / (59.5 + previous);
        if (weather.precipitation24hMm() > 0.5) {
            double effectiveRain = weather.precipitation24hMm() - 0.5;
            double rainMoisture = 42.5 * effectiveRain * Math.exp(-100 / (251 - moisture))
                    * (1 - Math.exp(-6.93 / effectiveRain));
            if (moisture > 150) {
                rainMoisture += 0.0015 * Math.pow(moisture - 150, 2) * Math.sqrt(effectiveRain);
            }
            moisture = Math.min(250, moisture + rainMoisture);
        }

        double humidity = weather.relativeHumidityPercent();
        double temperatureEffect = 0.18 * (21.1 - weather.temperatureCelsius())
                * (1 - Math.exp(-0.115 * humidity));
        double dryingEquilibrium = 0.942 * Math.pow(humidity, 0.679)
                + 11 * Math.exp((humidity - 100) / 10) + temperatureEffect;
        double wettingEquilibrium = 0.618 * Math.pow(humidity, 0.753)
                + 10 * Math.exp((humidity - 100) / 10) + temperatureEffect;

        if (moisture > dryingEquilibrium) {
            double rate = moistureExchangeRate(humidity / 100, weather);
            moisture = dryingEquilibrium + (moisture - dryingEquilibrium) * Math.pow(10, -rate);
        } else if (moisture < wettingEquilibrium) {
            double rate = moistureExchangeRate((100 - humidity) / 100, weather);
            moisture = wettingEquilibrium - (wettingEquilibrium - moisture) * Math.pow(10, -rate);
        }
        return Math.clamp(59.5 * (250 - moisture) / (FFMC_MOISTURE_COEFFICIENT + moisture), 0, 101);
    }

    private double moistureExchangeRate(double humidityFraction, DailyWeather weather) {
        double rate = 0.424 * (1 - Math.pow(humidityFraction, 1.7))
                + 0.0694 * Math.sqrt(weather.windSpeedKmh()) * (1 - Math.pow(humidityFraction, 8));
        return rate * 0.581 * Math.exp(0.0365 * weather.temperatureCelsius());
    }

    private double calculateDMC(DailyWeather weather, double previous) {
        double afterRain = previous;
        if (weather.precipitation24hMm() > 1.5) {
            double effectiveRain = 0.92 * weather.precipitation24hMm() - 1.27;
            double moisture = 20 + 280 * Math.exp(-0.023 * previous);
            double rainFactor;
            if (previous <= 33) {
                rainFactor = 100 / (0.5 + 0.3 * previous);
            } else if (previous <= 65) {
                rainFactor = 14 - 1.3 * Math.log(previous);
            } else {
                rainFactor = 6.2 * Math.log(previous) - 17.2;
            }
            moisture += 1000 * effectiveRain / (48.77 + rainFactor * effectiveRain);
            afterRain = Math.max(0, 43.43 * (5.6348 - Math.log(moisture - 20)));
        }
        double temperature = Math.max(-1.1, weather.temperatureCelsius());
        double drying = 1.894 * (temperature + 1.1) * (100 - weather.relativeHumidityPercent())
                * DMC_DAY_LENGTH[weather.date().getMonthValue() - 1] * 0.0001;
        return afterRain + drying;
    }

    private double calculateDC(DailyWeather weather, double previous) {
        double afterRain = previous;
        if (weather.precipitation24hMm() > 2.8) {
            double effectiveRain = 0.83 * weather.precipitation24hMm() - 1.27;
            double moisture = 800 * Math.exp(-previous / 400);
            afterRain = Math.max(0, previous - 400 * Math.log1p(3.937 * effectiveRain / moisture));
        }
        double temperature = Math.max(-2.8, weather.temperatureCelsius());
        double drying = Math.max(0, (0.36 * (temperature + 2.8)
                + DC_SEASONAL_FACTOR[weather.date().getMonthValue() - 1]) / 2);
        return afterRain + drying;
    }

    private double calculateISI(double ffmc, double windSpeed) {
        double moisture = FFMC_MOISTURE_COEFFICIENT * (101 - ffmc) / (59.5 + ffmc);
        double fuelEffect = 91.9 * Math.exp(-0.1386 * moisture)
                * (1 + Math.pow(moisture, 5.31) / 49_300_000);
        return 0.208 * Math.exp(0.05039 * windSpeed) * fuelEffect;
    }

    private double calculateBUI(double dmc, double dc) {
        if (dmc == 0 && dc == 0) {
            return 0;
        }
        double buildup = 0.8 * dmc * dc / (dmc + 0.4 * dc);
        if (buildup < dmc) {
            buildup = dmc - (1 - buildup / dmc) * (0.92 + Math.pow(0.0114 * dmc, 1.7));
        }
        return Math.max(0, buildup);
    }

    private double calculateFWI(double isi, double bui) {
        double fuelAvailability = bui <= 80
                ? 0.626 * Math.pow(bui, 0.809) + 2
                : 1000 / (25 + 108.64 * Math.exp(-0.023 * bui));
        double intensity = 0.1 * isi * fuelAvailability;
        return intensity <= 1 ? intensity
                : Math.exp(2.72 * Math.pow(0.434 * Math.log(intensity), 0.647));
    }

}
