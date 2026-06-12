import { useCallback, useEffect, useState } from "react";
import { findNearestCity } from "../utils/cityTimezones";

export type GeolocationPermission = "granted" | "prompt" | "denied" | "unsupported";

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location access was denied. Allow location in your browser settings, then try again.";
    case 2:
      return "Your location could not be determined.";
    case 3:
      return "Location detection timed out. Try again.";
    default:
      return "Could not detect your location.";
  }
}

async function readGeolocationPermission(
  supported: boolean,
): Promise<GeolocationPermission> {
  if (!supported) return "unsupported";
  if (!navigator.permissions?.query) return "prompt";

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "prompt";
  }
}

export function useDeviceLocation() {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [permission, setPermission] = useState<GeolocationPermission>(
    supported ? "prompt" : "unsupported",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPermission = useCallback(async () => {
    setPermission(await readGeolocationPermission(supported));
  }, [supported]);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return;

    const controller = new AbortController();

    void navigator.permissions.query({ name: "geolocation" }).then((status) => {
      if (controller.signal.aborted) return;

      setPermission(status.state);

      const handleChange = () => {
        setPermission(status.state);
        if (status.state === "granted") {
          setError(null);
        }
      };

      status.addEventListener("change", handleChange);
      controller.signal.addEventListener("abort", () => {
        status.removeEventListener("change", handleChange);
      });
    });

    return () => controller.abort();
  }, [supported]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshPermission();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshPermission]);

  const detectCity = useCallback((): Promise<string | null> => {
    if (!supported) {
      setError("Location is not supported on this device.");
      setPermission("unsupported");
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
          setPermission("granted");

          if (!city) {
            setError("Could not match your location to a supported city.");
            resolve(null);
            return;
          }

          setError(null);
          resolve(city);
        },
        (positionError) => {
          setLoading(false);
          if (positionError.code === 1) {
            setPermission("denied");
          }
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

  return {
    supported,
    permission,
    loading,
    error,
    detectCity,
    refreshPermission,
  };
}
