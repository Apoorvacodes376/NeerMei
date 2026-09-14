"""
Generate a small synthetic water-quality dataset for cold-start bootstrap.
Columns: pH, turbidity, TDS, temperature, conductivity, label
label=1 means purifiable/potable, 0 means not.
"""
import csv
import random
import os

SEED = 42
random.seed(SEED)

ROWS = 200
OUT_PATH = os.path.join(os.path.dirname(__file__), "bootstrap.csv")

FIELDS = ["pH", "turbidity", "TDS", "temperature", "conductivity", "label"]


def _label(pH, turbidity, TDS):
    """Simple heuristic: safe ranges → label 1."""
    return int(6.5 <= pH <= 8.5 and turbidity <= 4.0 and TDS <= 500)


def generate():
    if os.path.exists(OUT_PATH):
        return OUT_PATH
    with open(OUT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for _ in range(ROWS):
            pH = round(random.uniform(5.5, 9.5), 2)
            turbidity = round(random.uniform(0, 8), 2)
            TDS = round(random.uniform(100, 800), 1)
            temperature = round(random.uniform(15, 35), 1)
            conductivity = round(random.uniform(200, 900), 1)
            writer.writerow({
                "pH": pH, "turbidity": turbidity, "TDS": TDS,
                "temperature": temperature, "conductivity": conductivity,
                "label": _label(pH, turbidity, TDS),
            })
    return OUT_PATH


if __name__ == "__main__":
    generate()
    print(f"Dataset written to {OUT_PATH}")
