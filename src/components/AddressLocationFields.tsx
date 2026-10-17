"use client";

import { useEffect, useId, useState } from "react";
import type {
  PsgcBarangay,
  PsgcCity,
  PsgcProvince,
  PsgcRegion,
} from "@/lib/psgc";

// Cascading PSGC dropdowns: region -> province -> city/municipality ->
// barangay (docs/design/checkout.md "Nationwide address: PSGC dropdowns").
// Shared by checkout's manual-entry form and the /account/addresses modal
// so both always submit the same fields: regionCode, provinceCode
// (blank for Metro Manila), cityCode, barangayCode.
//
// Regions and provinces (~100 rows) come in as props with the page.
// Cities and barangays are fetched per selection from /api/locations/*,
// so the ~42k barangays never ship to the browser all at once.

export type LocationCodes = {
  regionCode: string | null;
  provinceCode: string | null;
  cityCode: string | null;
  barangayCode: string | null;
};

type ListState<T> = { status: "ready"; items: T[] } | { status: "error" };

// Module-level so switching back and forth between options (or between
// address modals) doesn't refetch. Failed requests are dropped so "Try
// again" really retries.
const requestCache = new Map<string, Promise<unknown[]>>();

function fetchList<T>(url: string, key: "cities" | "barangays"): Promise<T[]> {
  let request = requestCache.get(url);
  if (!request) {
    request = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body) => body[key] as unknown[]);
    request.catch(() => requestCache.delete(url));
    requestCache.set(url, request);
  }
  return request as Promise<T[]>;
}

function useList<T>(url: string | null, key: "cities" | "barangays") {
  const [lists, setLists] = useState<Record<string, ListState<T>>>({});
  const state = url ? lists[url] : undefined;

  useEffect(() => {
    if (!url || state) return;
    let active = true;
    fetchList<T>(url, key).then(
      (items) => active && setLists((l) => ({ ...l, [url]: { status: "ready", items } })),
      () => active && setLists((l) => ({ ...l, [url]: { status: "error" } }))
    );
    return () => {
      active = false;
    };
  }, [url, key, state]);

  function retry() {
    if (!url) return;
    setLists((l) => {
      const next = { ...l };
      delete next[url];
      return next;
    });
  }

  return {
    loading: !!url && !state,
    error: state?.status === "error",
    items: state?.status === "ready" ? state.items : [],
    retry,
  };
}

export function AddressLocationFields({
  regions,
  provinces,
  initial,
  fieldClass,
  labelClass,
  showLabels,
  rowGapClass,
  postalCodeField,
}: {
  regions: PsgcRegion[];
  provinces: PsgcProvince[];
  initial?: LocationCodes;
  fieldClass: string;
  labelClass: string;
  // Checkout labels every field; the compact account modal uses the first
  // (disabled) option as a placeholder instead, like its text inputs.
  showLabels: boolean;
  rowGapClass: string;
  // Rendered next to Barangay, keeping the existing two-column
  // "Barangay | Postal code" row.
  postalCodeField: React.ReactNode;
}) {
  const id = useId();
  const [regionCode, setRegionCode] = useState(initial?.regionCode ?? "");
  const [provinceCode, setProvinceCode] = useState(initial?.provinceCode ?? "");
  const [cityCode, setCityCode] = useState(initial?.cityCode ?? "");
  const [barangayCode, setBarangayCode] = useState(initial?.barangayCode ?? "");

  const regionValid = regions.some((r) => r.code === regionCode);
  const regionProvinces = provinces.filter((p) => p.regionCode === regionCode);
  // Metro Manila (NCR) is the only region with no provinces.
  const noProvinces = regionValid && regionProvinces.length === 0;
  const provinceValid = regionProvinces.some((p) => p.code === provinceCode);

  const cityUrl =
    regionValid && (noProvinces || provinceValid)
      ? `/api/locations/cities?region=${regionCode}${
          noProvinces ? "" : `&province=${provinceCode}`
        }`
      : null;
  const cities = useList<PsgcCity>(cityUrl, "cities");
  const cityValid = cities.items.some((c) => c.code === cityCode);

  // Fetched as soon as there's a city code (even before the city list has
  // confirmed it) so an edit form fills both levels in parallel.
  const barangayUrl = cityUrl && cityCode ? `/api/locations/barangays?city=${cityCode}` : null;
  const barangays = useList<PsgcBarangay>(barangayUrl, "barangays");
  const barangayValid =
    cityValid && barangays.items.some((b) => b.code === barangayCode);

  const label = (htmlFor: string, text: string) =>
    showLabels ? (
      <label className={labelClass} htmlFor={htmlFor}>
        {text}
      </label>
    ) : null;
  const selectClass = showLabels ? `mt-1 ${fieldClass}` : fieldClass;

  const loadError = (retry: () => void, what: string) => (
    <p className="mt-1 text-sm text-red-600">
      Couldn&apos;t load the {what} list.{" "}
      <button type="button" onClick={retry} className="underline underline-offset-4">
        Try again
      </button>
    </p>
  );

  return (
    <>
      <div>
        {label(`${id}-region`, "Region")}
        <select
          id={`${id}-region`}
          name="regionCode"
          aria-label={showLabels ? undefined : "Region"}
          required
          value={regionValid ? regionCode : ""}
          onChange={(e) => {
            setRegionCode(e.target.value);
            setProvinceCode("");
            setCityCode("");
            setBarangayCode("");
          }}
          className={selectClass}
        >
          <option value="" disabled>
            Select a region
          </option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        {label(`${id}-province`, "Province")}
        {noProvinces ? (
          <>
            {/* Disabled selects don't submit — send the blank province
                explicitly. Shown (not hidden) so the field order doesn't
                jump around when switching regions. */}
            <input type="hidden" name="provinceCode" value="" />
            <select
              id={`${id}-province`}
              aria-label={showLabels ? undefined : "Province"}
              disabled
              value="ncr"
              className={`${selectClass} disabled:opacity-60`}
            >
              <option value="ncr">Metro Manila</option>
            </select>
          </>
        ) : (
          <select
            id={`${id}-province`}
            name="provinceCode"
            aria-label={showLabels ? undefined : "Province"}
            required
            disabled={!regionValid}
            value={provinceValid ? provinceCode : ""}
            onChange={(e) => {
              setProvinceCode(e.target.value);
              setCityCode("");
              setBarangayCode("");
            }}
            className={`${selectClass} disabled:opacity-60`}
          >
            <option value="" disabled>
              {regionValid ? "Select a province" : "Province"}
            </option>
            {regionProvinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        {label(`${id}-city`, "City / municipality")}
        <select
          id={`${id}-city`}
          name="cityCode"
          aria-label={showLabels ? undefined : "City / municipality"}
          required
          disabled={!cityUrl || cities.loading || cities.error}
          value={cityValid ? cityCode : ""}
          onChange={(e) => {
            setCityCode(e.target.value);
            setBarangayCode("");
          }}
          className={`${selectClass} disabled:opacity-60`}
        >
          <option value="" disabled>
            {cities.loading
              ? "Loading…"
              : cityUrl
                ? "Select a city or municipality"
                : "City / municipality"}
          </option>
          {cities.items.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {cities.error && loadError(cities.retry, "city")}
      </div>

      <div className={`grid grid-cols-2 ${rowGapClass}`}>
        <div className="min-w-0">
          {label(`${id}-barangay`, "Barangay")}
          <select
            id={`${id}-barangay`}
            name="barangayCode"
            aria-label={showLabels ? undefined : "Barangay"}
            required
            disabled={!cityValid || barangays.loading || barangays.error}
            value={barangayValid ? barangayCode : ""}
            onChange={(e) => setBarangayCode(e.target.value)}
            className={`${selectClass} disabled:opacity-60`}
          >
            <option value="" disabled>
              {cityValid && barangays.loading ? "Loading…" : cityValid ? "Select a barangay" : "Barangay"}
            </option>
            {cityValid &&
              barangays.items.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.subMunicipality ? `${b.name} (${b.subMunicipality})` : b.name}
                </option>
              ))}
          </select>
          {cityValid && barangays.error && loadError(barangays.retry, "barangay")}
        </div>
        <div className="min-w-0">{postalCodeField}</div>
      </div>
    </>
  );
}
