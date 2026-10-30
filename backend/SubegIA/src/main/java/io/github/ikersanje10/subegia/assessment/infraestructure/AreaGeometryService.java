package io.github.ikersanje10.subegia.assessment.infraestructure;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryCollection;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LinearRing;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import io.github.ikersanje10.subegia.assessment.domain.exception.InvalidAreaGeometryException;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.WeatherGridProperties;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class AreaGeometryService {

    private final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory();

    private final WeatherGridProperties gridProperties;

    public AreaGeometryService(WeatherGridProperties gridProperties) {
        this.gridProperties = gridProperties;
    }

    public Geometry loadGipuzkoaPolygon(ObjectMapper mapper) {
        try (InputStream in = new ClassPathResource("geo/gipuzkoa.geojson").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            JsonNode geometry = root.path("features").get(0).path("geometry");
            return new GeoJsonReader().read(geometry.toString());
        } catch (IOException | ParseException e) {
            throw new IllegalStateException("It was not possible to load the Gipuzkoa boundary from the classpath.", e);
        }
    }

    public List<SubArea> generateSubAreas(Geometry selectedArea) {
        GridRange range = calculateGridRange(selectedArea);
        List<SubArea> candidateCells = generateCandidateCells(range);
        return clipCellsToSelectedArea(candidateCells, selectedArea);
    }

    private GridRange calculateGridRange(Geometry selectedArea) {
        Envelope envelope = selectedArea.getEnvelopeInternal();

        double longitudeOrigin = gridProperties.longitudeOrigin();
        double latitudeOrigin = gridProperties.latitudeOrigin();
        double longitudeStep = gridProperties.longitudeStep();
        double latitudeStep = gridProperties.latitudeStep();

        // Round outward to include candidate cells whose centers lie outside the
        // selection.
        int firstColumn = Math.max(0, (int) Math.floor(
                (envelope.getMinX() - longitudeOrigin) / longitudeStep - 0.5));
        int lastColumn = Math.min(gridProperties.columns() - 1, (int) Math.ceil(
                (envelope.getMaxX() - longitudeOrigin) / longitudeStep + 0.5));

        int firstRow = Math.max(0, (int) Math.floor(
                (envelope.getMinY() - latitudeOrigin) / latitudeStep - 0.5));
        int lastRow = Math.min(gridProperties.rows() - 1, (int) Math.ceil(
                (envelope.getMaxY() - latitudeOrigin) / latitudeStep + 0.5));

        return new GridRange(firstColumn, lastColumn, firstRow, lastRow);
    }

    private List<SubArea> generateCandidateCells(GridRange range) {
        List<SubArea> candidateCells = new ArrayList<>();

        for (int column = range.firstColumn(); column <= range.lastColumn(); column++) {
            for (int row = range.firstRow(); row <= range.lastRow(); row++) {
                double centerLongitude = gridProperties.longitudeOrigin() + column * gridProperties.longitudeStep();
                double centerLatitude = gridProperties.latitudeOrigin() + row * gridProperties.latitudeStep();
                Geometry cell = createCellGeometry(centerLongitude, centerLatitude);
                candidateCells.add(new SubArea(
                        cell, column, row, centerLongitude, centerLatitude));
            }
        }

        return candidateCells;
    }

    private List<SubArea> clipCellsToSelectedArea(List<SubArea> candidateCells, Geometry selectedArea) {
        List<SubArea> subAreas = new ArrayList<>();

        for (SubArea cell : candidateCells) {
            Geometry intersection = cell.geometry().intersection(selectedArea);
            List<Polygon> polygons = new ArrayList<>();
            collectPolygons(intersection, polygons);

            if (!polygons.isEmpty()) {
                Geometry clippedArea = GEOMETRY_FACTORY.buildGeometry(polygons);
                subAreas.add(new SubArea(
                        clippedArea, cell.column(), cell.row(),
                        cell.centerLongitude(), cell.centerLatitude()));
            }
        }

        return subAreas;
    }

    private void collectPolygons(Geometry geometry, List<Polygon> polygons) {
        if (geometry instanceof Polygon polygon) {
            if (!polygon.isEmpty() && polygon.getArea() > 0) {
                polygons.add(polygon);
            }
        } else if (geometry instanceof GeometryCollection collection) {
            for (int index = 0; index < collection.getNumGeometries(); index++) {
                collectPolygons(collection.getGeometryN(index), polygons);
            }
        }
    }

    private record GridRange(int firstColumn, int lastColumn, int firstRow, int lastRow) {
    }

    private Geometry createCellGeometry(double centerLongitude, double centerLatitude) {
        double halfLongitudeStep = gridProperties.longitudeStep() / 2;
        double halfLatitudeStep = gridProperties.latitudeStep() / 2;

        double west = centerLongitude - halfLongitudeStep;
        double east = centerLongitude + halfLongitudeStep;
        double south = centerLatitude - halfLatitudeStep;
        double north = centerLatitude + halfLatitudeStep;

        return GEOMETRY_FACTORY.toGeometry(new Envelope(west, east, south, north));
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
