package io.github.ikersanje10.subegia.assessment.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AreaGeometryRequest(

                @NotBlank(message = "The type is mandatory") @NotNull @Pattern(regexp = "Polygon", message = "The type must be Polygon") String type,

                @NotNull @Size(min = 1, max = 1, message = "Exactly one ring is required") List<@NotNull @Size(min = 4, message = "The ring must contain at least four positions") List<@NotNull @Size(min = 2, max = 2, message = "Each position must contain longitude and latitude") List<@NotNull Double>>> coordinates) {
}
