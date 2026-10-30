package io.github.ikersanje10.subegia.assessment.infraestructure;

import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.operation.union.UnaryUnionOp;

import java.util.List;

import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.WeatherGridProperties;

import static org.junit.jupiter.api.Assertions.*;

class AreaGeometryServiceTests {

    private final GeometryFactory geometryFactory = new GeometryFactory();
    private final WeatherGridProperties grid = new WeatherGridProperties(
            "meteofrance_arome_france_hd", -12.0, 37.5, 0.01, 0.01, 2801, 1791);
    private final AreaGeometryService service = new AreaGeometryService(grid);

    @Test
    void clipsCellsToSelectionAndKeepsTheirOriginalGridCenters() {
        Geometry selection = geometryFactory.toGeometry(
                new Envelope(-2.492, -2.482, 43.077, 43.083));

        var candidates = service.generateSubAreas(selection);

        assertEquals(2, candidates.size());
        assertEquals(2L, candidates.stream()
                .map(cell -> cell.column() + ":" + cell.row()).distinct().count());

        SubArea cell = candidates.stream()
                .filter(candidate -> candidate.column() == 951 && candidate.row() == 558)
                .findFirst().orElseThrow();

        assertEquals(-2.49, cell.centerLongitude(), 1e-10);
        assertEquals(43.08, cell.centerLatitude(), 1e-10);
        Envelope bounds = cell.geometry().getEnvelopeInternal();
        assertEquals(-2.492, bounds.getMinX(), 1e-10);
        assertEquals(-2.485, bounds.getMaxX(), 1e-10);
        assertEquals(43.077, bounds.getMinY(), 1e-10);
        assertEquals(43.083, bounds.getMaxY(), 1e-10);

        for (SubArea candidate : candidates) {
            assertEquals("Polygon", candidate.geometry().getGeometryType());
            assertTrue(candidate.geometry().isValid());
            assertTrue(candidate.geometry().getArea() > 0);
            assertEquals(grid.longitudeOrigin() + candidate.column() * grid.longitudeStep(),
                    candidate.centerLongitude(), 1e-10);
            assertEquals(grid.latitudeOrigin() + candidate.row() * grid.latitudeStep(),
                    candidate.centerLatitude(), 1e-10);
        }

        assertTrue(candidates.stream().anyMatch(candidate -> !selection.covers(
                geometryFactory.createPoint(new org.locationtech.jts.geom.Coordinate(
                        candidate.centerLongitude(), candidate.centerLatitude())))));
        assertPartition(selection, candidates);
    }

    @Test
    void keepsCandidateIndicesWithinGridDimensions() {
        for (Geometry selection : new Geometry[] {
                geometryFactory.toGeometry(new Envelope(-12.002, -11.998, 37.498, 37.502)),
                geometryFactory.toGeometry(new Envelope(15.998, 16.002, 55.398, 55.402))
        }) {
            var candidates = service.generateSubAreas(selection);

            assertFalse(candidates.isEmpty());
            assertTrue(candidates.stream().allMatch(cell ->
                    cell.column() >= 0 && cell.column() < grid.columns()
                            && cell.row() >= 0 && cell.row() < grid.rows()));
        }
    }

    @Test
    void preservesDisconnectedPartsOfAConcaveSelectionWithinOneCell() throws ParseException {
        AreaGeometryService localService = new AreaGeometryService(
                new WeatherGridProperties("test", 5, 5, 10, 10, 3, 3));
        Geometry selection = new WKTReader().read(
                "POLYGON ((1 1, 3 1, 3 12, 7 12, 7 1, 9 1, 9 19, 1 19, 1 1))");

        List<SubArea> subAreas = localService.generateSubAreas(selection);

        assertEquals(2, subAreas.size());
        SubArea bottomCell = subAreas.stream()
                .filter(cell -> cell.row() == 0).findFirst().orElseThrow();
        assertEquals("MultiPolygon", bottomCell.geometry().getGeometryType());
        assertEquals(2, bottomCell.geometry().getNumGeometries());
        assertPartition(selection, subAreas);
    }

    @Test
    void discardsBoundaryContactsIncludingThoseMixedWithPolygons() throws ParseException {
        AreaGeometryService localService = new AreaGeometryService(
                new WeatherGridProperties("test", 5, 5, 10, 10, 3, 3));
        Geometry selection = new WKTReader().read(
                "MULTIPOLYGON (((1 1, 4 1, 4 4, 1 4, 1 1)),"
                        + " ((10 8, 12 7, 12 9, 10 8)))");

        List<SubArea> subAreas = localService.generateSubAreas(selection);

        assertEquals(2, subAreas.size());
        assertTrue(subAreas.stream().allMatch(cell ->
                cell.geometry().getGeometryType().equals("Polygon")));
        assertPartition(selection, subAreas);

        Geometry alignedSelection = geometryFactory.toGeometry(new Envelope(0, 10, 0, 10));
        List<SubArea> alignedSubAreas = localService.generateSubAreas(alignedSelection);
        assertEquals(1, alignedSubAreas.size());
        assertPartition(alignedSelection, alignedSubAreas);
    }

    private void assertPartition(Geometry selection, List<SubArea> subAreas) {
        List<Geometry> parts = subAreas.stream().map(SubArea::geometry).toList();
        Geometry union = UnaryUnionOp.union(parts);
        assertEquals(0, selection.symDifference(union).getArea(), 1e-12);
        assertEquals(union.getArea(), parts.stream().mapToDouble(Geometry::getArea).sum(), 1e-12);
        for (Geometry part : parts) {
            assertTrue(part.isValid());
            assertTrue(part.getArea() > 0);
            assertEquals(0, part.difference(selection).getArea(), 1e-12);
        }
    }
}
