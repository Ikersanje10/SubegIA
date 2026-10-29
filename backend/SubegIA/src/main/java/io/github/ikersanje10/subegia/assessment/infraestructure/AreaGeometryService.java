package io.github.ikersanje10.subegia.assessment.infraestructure;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LinearRing;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import io.github.ikersanje10.subegia.assessment.domain.exception.InvalidAreaGeometryException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class AreaGeometryService {

    private final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory();

    public Geometry loadGipuzkoaPolygon(ObjectMapper mapper) {
        try (InputStream in = new ClassPathResource("geo/gipuzkoa.geojson").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            JsonNode geometry = root.path("features").get(0).path("geometry");
            return new GeoJsonReader().read(geometry.toString());
        } catch (IOException | ParseException e) {
            throw new IllegalStateException("It was not possible to load the Gipuzkoa boundary from the classpath.", e);
        }
    }

    public Geometry loadSelectedAreaAsGeometry(List<List<List<Double>>> coordinates) {
        LinearRing shell = toRing(coordinates.get(0));

        LinearRing[] holes = coordinates.stream()
                .skip(1)
                .map(this::toRing)
                .toArray(LinearRing[]::new);

        return GEOMETRY_FACTORY.createPolygon(shell, holes);
    }

    private LinearRing toRing(List<List<Double>> points) {
        Coordinate[] coords = points.stream()
                .map(this::createValidCoordinates)
                .toArray(Coordinate[]::new);

        if (!coords[0].equals2D(coords[coords.length - 1])) {
            throw new InvalidAreaGeometryException("The ring must start and end at the same coordinates.");
        }

        return GEOMETRY_FACTORY.createLinearRing(coords);
    }

    private Coordinate createValidCoordinates(List<Double> p) {
        Double longitude = p.get(0);
        Double latitude = p.get(1);

        if (!Double.isFinite(longitude)
                || !Double.isFinite(latitude)
                || longitude < -180 || longitude > 180
                || latitude < -90 || latitude > 90) {
            throw new InvalidAreaGeometryException(
                    "Coordinates must be finite numbers with longitude between -180 and 180 and latitude between -90 and 90.");
        }

        return new Coordinate(longitude, latitude);
    }
}
