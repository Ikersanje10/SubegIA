package io.github.ikersanje10.subegia.shared.api;

import java.util.List;
import java.util.Map;

public record ApiErrorResponse(int status, String code, String detail, Map<String, List<String>> fieldErrors) {}
