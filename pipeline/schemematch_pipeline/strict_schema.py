"""The output schema sent to Groq with strict: true.

Strict mode needs every property required, additionalProperties false on every object and
anyOf instead of oneOf. Field and operator lists come from packages/engine/rule.schema.json,
so there is one source of truth. Per-operator value types are checked afterwards by validate.py.
"""

from .validate import RULE_SCHEMA

FIELDS = RULE_SCHEMA["$defs"]["field"]["enum"]
OPS = RULE_SCHEMA["$defs"]["condition"]["properties"]["op"]["enum"]


def _group(kind: str) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [kind],
        "properties": {kind: {"type": "array", "items": {"$ref": "#/$defs/node"}}},
    }


def output_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["eligibility", "unmodelled", "ambiguous"],
        "properties": {
            "eligibility": {"$ref": "#/$defs/all"},
            "unmodelled": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["text", "source_quote"],
                    "properties": {"text": {"type": "string"}, "source_quote": {"type": "string"}},
                },
            },
            "ambiguous": {"type": "array", "items": {"type": "string"}},
        },
        "$defs": {
            "node": {"anyOf": [{"$ref": "#/$defs/condition"}, {"$ref": "#/$defs/all"}, {"$ref": "#/$defs/any"}]},
            "all": _group("all"),
            "any": _group("any"),
            "condition": {
                "type": "object",
                "additionalProperties": False,
                "required": ["field", "op", "value", "source_quote"],
                "properties": {
                    "field": {"type": "string", "enum": FIELDS},
                    "op": {"type": "string", "enum": OPS},
                    "value": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "number"},
                            {"type": "boolean"},
                            {"type": "array", "items": {"anyOf": [{"type": "string"}, {"type": "number"}]}},
                        ]
                    },
                    "source_quote": {"type": "string"},
                },
            },
        },
    }
