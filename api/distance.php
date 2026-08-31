<?php
declare(strict_types=1);

/**
 * Great-circle distance between two lat/long points, in meters.
 * This is the Haversine formula — it accounts for the Earth's curvature,
 * which matters even at short ranges once you're being strict about
 * "is this person within 100m of the salon."
 */
function distanceInMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earthRadius = 6371000; // meters

    $lat1Rad   = deg2rad($lat1);
    $lat2Rad   = deg2rad($lat2);
    $deltaLat  = deg2rad($lat2 - $lat1);
    $deltaLng  = deg2rad($lng2 - $lng1);

    $a = sin($deltaLat / 2) ** 2
        + cos($lat1Rad) * cos($lat2Rad) * sin($deltaLng / 2) ** 2;
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

    return $earthRadius * $c;
}
