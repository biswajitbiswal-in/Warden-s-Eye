from pathlib import Path
from collections import Counter
import yaml

dataset = Path("construction-ppe")

# Read class names
with open(dataset / "data.yaml", "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)

names = data["names"]

if isinstance(names, dict):
    class_names = names
else:
    class_names = {i: name for i, name in enumerate(names)}

counts = Counter()
image_counts = Counter()

total_images = 0

for split in ["train", "val", "test"]:

    label_dir = dataset / "labels" / split
    image_dir = dataset / "images" / split

    label_files = list(label_dir.glob("*.txt"))

    image_extensions = ["*.jpg", "*.jpeg", "*.png"]
    image_files = []

    for ext in image_extensions:
        image_files.extend(image_dir.glob(ext))

    total_images += len(image_files)

    for label_file in label_files:

        found_classes = set()

        with open(label_file, "r", encoding="utf-8") as f:

            for line in f:

                parts = line.strip().split()

                if not parts:
                    continue

                class_id = int(parts[0])

                counts[class_id] += 1
                found_classes.add(class_id)

        for class_id in found_classes:
            image_counts[class_id] += 1


print("\n========== CONSTRUCTION PPE ANALYSIS ==========\n")

for class_id, name in class_names.items():

    print(
        f"{name:<15} → "
        f"{counts[class_id]} annotations | "
        f"{image_counts[class_id]} images"
    )

print("\n===============================================")
print(f"Total images: {total_images}")