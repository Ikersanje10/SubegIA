package io.github.ikersanje10.subegia.assessment.infraestructure.config;

import org.locationtech.jts.geom.Geometry;

public record SubArea(Geometry geometry,
        int column,
        int row,
        double centerLongitude,
        double centerLatitude) {
}
