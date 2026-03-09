/**
 * Anonymization & Aggregation Engine — Sprint 101
 * Transforms payloads when crossing boundaries requires anonymization or aggregation.
 */

export interface TransformationResult {
  transformed_payload: Record<string, unknown>;
  transformation_type: "anonymization" | "aggregation";
  fields_removed: string[];
  fields_transformed: string[];
  summary: string;
}

const PII_FIELDS = ["email", "name", "phone", "address", "ssn", "user_id", "ip_address", "user_name", "full_name"];

export function anonymizePayload(payload: Record<string, unknown>): TransformationResult {
  const result: Record<string, unknown> = {};
  const removed: string[] = [];
  const transformed: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (PII_FIELDS.some((f) => lowerKey.includes(f))) {
      removed.push(key);
      continue;
    }
    if (typeof value === "string" && value.includes("@")) {
      result[key] = "[REDACTED]";
      transformed.push(key);
    } else {
      result[key] = value;
    }
  }

  return {
    transformed_payload: result,
    transformation_type: "anonymization",
    fields_removed: removed,
    fields_transformed: transformed,
    summary: `Anonymized payload: removed ${removed.length} PII field(s), transformed ${transformed.length} field(s).`,
  };
}

export function aggregatePayloads(payloads: Record<string, unknown>[]): TransformationResult {
  if (payloads.length === 0) {
    return {
      transformed_payload: { count: 0 },
      transformation_type: "aggregation",
      fields_removed: [],
      fields_transformed: [],
      summary: "No payloads to aggregate.",
    };
  }

  const numericKeys: Record<string, number[]> = {};
  const categoricalKeys: Record<string, Record<string, number>> = {};

  for (const p of payloads) {
    for (const [key, value] of Object.entries(p)) {
      const lowerKey = key.toLowerCase();
      if (PII_FIELDS.some((f) => lowerKey.includes(f))) continue;

      if (typeof value === "number") {
        if (!numericKeys[key]) numericKeys[key] = [];
        numericKeys[key].push(value);
      } else if (typeof value === "string") {
        if (!categoricalKeys[key]) categoricalKeys[key] = {};
        categoricalKeys[key][value] = (categoricalKeys[key][value] || 0) + 1;
      }
    }
  }

  const agg: Record<string, unknown> = { count: payloads.length };
  const transformed: string[] = [];

  for (const [key, values] of Object.entries(numericKeys)) {
    agg[`${key}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
    agg[`${key}_min`] = Math.min(...values);
    agg[`${key}_max`] = Math.max(...values);
    transformed.push(key);
  }

  for (const [key, dist] of Object.entries(categoricalKeys)) {
    agg[`${key}_distribution`] = dist;
    transformed.push(key);
  }

  return {
    transformed_payload: agg,
    transformation_type: "aggregation",
    fields_removed: [],
    fields_transformed: transformed,
    summary: `Aggregated ${payloads.length} payload(s): ${transformed.length} field(s) aggregated.`,
  };
}
