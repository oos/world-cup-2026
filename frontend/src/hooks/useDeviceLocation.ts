import { useCallback, useState } from "react";
import { findNearestCity } from "../utils/cityTimezones";

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location access was denied. Allow location in your browser to detect your city.";
    case 2:
      return "Your location could not be determined.";
    case 3:
      return "Location detection timed out. Try again.";
    default:
      return "Could not detect your location.";
  }
}

export function useDeviceLocation() {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectCity = useCallback((): Promise<string | null> => {
    if (!supported) {
      setError("Location is not supported on this device.");
      return Promise.resolve(null);
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const city = findNearestCity(
            position.coords.latitude,
            position.coords.longitude,
          );
          setLoading(false);

          if (!city) {
            setError("Could not match your location to a supported city.");
            resolve(null);
            return;
          }

          resolve(city);
        },
        (positionError) => {
          setLoading(false);
          setError(geolocationErrorMessage(positionError.code));
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        },
      );
    });
  }, [supported]);

  return { supported, loading, error, detectCity };
}
