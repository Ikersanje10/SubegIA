package io.github.ikersanje10.subegia.assessment.domain;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class FWICalculatorTests {

    private final FWICalculator calculator = new FWICalculator();
    private final LocalDate firstDate = LocalDate.of(2026, 7, 1);

    @Test
    void matchesReferenceComponentsForAnOriginalSyntheticFiveDaySeries() {
        double[][] inputs = {
                {18.2, 65, 12.3, 0},
                {22.8, 40, 17.5, 0.5},
                {16, 78, 8.1, 1.5},
                {14.3, 90, 4.2, 2.8},
                {25.1, 32, 24.6, 12.4}
        };
        // Numerical outputs from the pinned external cffdrs reference; no reference source/fixtures copied.
        double[][] expected = {
                {85.0, 7.586452280, 21.98, 3.912402046, 8.144858538, 3.731399077},
                {88.912770495, 10.95428732, 29.788, 8.852122821, 11.414556212, 9.726564713},
                {74.231177140, 11.837815592, 36.372, 1.106205895, 13.054043319, 0.774652510},
                {49.083661241, 9.021754087, 42.65, 0.180423184, 11.802206570, 0.119277278},
                {76.107559038, 8.193425970, 31.586394146, 2.825381490, 9.940502613, 2.860690073}
        };
        List<DailyWeather> weather = new ArrayList<>();
        for (int i = 0; i < inputs.length; i++) {
            weather.add(new DailyWeather(firstDate.plusDays(i), 43.3,
                    inputs[i][0], inputs[i][1], inputs[i][2], inputs[i][3]));
        }

        var results = calculator.calculateSeries(weather, initial(85, 6, 15));

        assertEquals(5, results.size());
        for (int i = 0; i < results.size(); i++) {
            FWIResult result = results.get(i);
            assertArrayEquals(expected[i], components(result), 1e-7);
            assertEquals(weather.get(i), result.weather());
            assertEquals(weather.get(i).date(), result.moistureState().date());
            assertEquals(FWIRiskLevel.LOW, result.riskLevel());
        }
        FWIResult manual = calculator.calculateDay(weather.getFirst(), initial(85, 6, 15));
        for (int i = 1; i < weather.size(); i++) {
            manual = calculator.calculateDay(weather.get(i), manual.moistureState());
        }
        assertEquals(results.getLast(), manual);
        assertThrows(UnsupportedOperationException.class, () -> results.clear());
    }

    @ParameterizedTest
    @CsvSource({
            "30,50,400,5,95,2,30,1,4.959148803,18.857318827,290.732851948,0.000000071799,32.452376995,0.000000089399",
            "95,100,800,35,15,40,0,7,96.857500935,107.206556360,810.004,83.538243178,161.105931225,133.348240103",
            "85,0,0,-10,100,0,0,1,79.708125091,0,0,1.102534169,0,0.220506834"
    })
    void handlesWetDryAndWinterBranches(double ffmc, double dmc, double dc,
            double temperature, double humidity, double wind, double rain, int month,
            double expectedFFMC, double expectedDMC, double expectedDC,
            double expectedISI, double expectedBUI, double expectedFWI) {
        LocalDate date = LocalDate.of(2026, month, 1);
        var result = calculator.calculateDay(new DailyWeather(date, 43.3, temperature, humidity, wind, rain),
                new FWIMoistureState(date.minusDays(1), ffmc, dmc, dc));
        assertArrayEquals(new double[] {expectedFFMC, expectedDMC, expectedDC,
                expectedISI, expectedBUI, expectedFWI}, components(result), 1e-7);
    }

    @Test
    void rejectsMissingOutOfOrderDuplicateAndMixedLatitudeDays() {
        DailyWeather first = weather(firstDate, 43.3);
        FWIMoistureState initial = initial(85, 6, 15);
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateDay(first, null));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateDay(null, initial));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateDay(first,
                new FWIMoistureState(firstDate, 85, 6, 15)));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(List.of(), initial));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(null, initial));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(List.of(first), null));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(
                java.util.Arrays.asList(first, null), initial));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(
                List.of(first, weather(firstDate.plusDays(2), 43.3)), initial));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(
                List.of(first, first), initial));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(
                List.of(weather(firstDate.plusDays(1), 43.3), first), initial));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculateSeries(
                List.of(first, weather(firstDate.plusDays(1), 43.34)), initial));
    }

    @Test
    void rejectsInvalidWeatherStatesAndResultsRatherThanReturningDefaults() {
        for (double value : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, value, 50, 10, 0));
            assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, 20, value, 10, 0));
            assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, 20, 50, value, 0));
            assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, 20, 50, 10, value));
            assertThrows(IllegalArgumentException.class, () -> new FWIMoistureState(firstDate, value, 6, 15));
            assertThrows(IllegalArgumentException.class, () -> new FWIMoistureState(firstDate, 85, value, 15));
            assertThrows(IllegalArgumentException.class, () -> new FWIMoistureState(firstDate, 85, 6, value));
        }
        assertThrows(IllegalArgumentException.class, () -> weather(firstDate, 29.9));
        assertThrows(IllegalArgumentException.class, () -> weather(firstDate, 90.1));
        assertThrows(IllegalArgumentException.class, () -> weather(firstDate, Double.NaN));
        assertThrows(IllegalArgumentException.class, () -> weather(null, 43.3));
        assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, 20, 101, 10, 0));
        assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, 20, -1, 10, 0));
        assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, 20, 50, -1, 0));
        assertThrows(IllegalArgumentException.class, () -> new DailyWeather(firstDate, 43.3, 20, 50, 10, -1));
        assertThrows(IllegalArgumentException.class, () -> new FWIMoistureState(null, 85, 6, 15));
        assertThrows(IllegalArgumentException.class, () -> initial(102, 6, 15));
        assertThrows(IllegalArgumentException.class, () -> initial(-1, 6, 15));
        assertThrows(IllegalArgumentException.class, () -> initial(85, -1, 15));
        assertThrows(IllegalArgumentException.class, () -> initial(85, 6, -1));
        assertThrows(IllegalArgumentException.class, () -> new FWIResult(weather(firstDate, 43.3),
                initial(85, 6, 15), 1, 1, 1));
        assertThrows(IllegalArgumentException.class, () -> new FWIResult(weather(firstDate, 43.3),
                new FWIMoistureState(firstDate, 85, 6, 15), 1, 1, Double.NaN));
    }

    @Test
    void respectsLeapDayAndYearRollover() {
        for (LocalDate date : List.of(LocalDate.of(2024, 2, 29), LocalDate.of(2025, 1, 1))) {
            assertDoesNotThrow(() -> calculator.calculateDay(weather(date, 43.3),
                    new FWIMoistureState(date.minusDays(1), 85, 6, 15)));
        }
    }

    @ParameterizedTest
    @CsvSource({
            "0,LOW", "11.199999,LOW", "11.2,MODERATE", "21.299999,MODERATE",
            "21.3,HIGH", "37.999999,HIGH", "38,VERY_HIGH", "49.999999,VERY_HIGH",
            "50,EXTREME", "70,EXTREME", "70.000001,VERY_EXTREME", "150,VERY_EXTREME"
    })
    void classifiesExactEFFISBoundaries(double fwi, FWIRiskLevel expected) {
        assertEquals(expected, FWIRiskLevel.fromFWI(fwi));
    }

    @Test
    void rejectsInvalidIndexInClassification() {
        for (double fwi : new double[] {-1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> FWIRiskLevel.fromFWI(fwi));
        }
    }

    private FWIMoistureState initial(double ffmc, double dmc, double dc) {
        return new FWIMoistureState(firstDate.minusDays(1), ffmc, dmc, dc);
    }

    private DailyWeather weather(LocalDate date, double latitude) {
        return new DailyWeather(date, latitude, 20, 50, 10, 0);
    }

    private double[] components(FWIResult result) {
        return new double[] {result.moistureState().ffmc(), result.moistureState().dmc(),
                result.moistureState().dc(), result.isi(), result.bui(), result.fwi()};
    }
}
