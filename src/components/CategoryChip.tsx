import type { Category } from "../types";

type CategoryChipProps = {
  category: Category;
  variant?: "solid" | "outline";
  asButton?: boolean;
  isActive?: boolean;
  onClick?: () => void;
};

const labels: Record<Category, string> = {
  seedling: "Fidan",
  meaningful_tree: "Anlamlı Ağaç",
  route: "Fidan Rotası",
};

export default function CategoryChip({
  category,
  variant = "solid",
  asButton,
  isActive,
  onClick,
}: CategoryChipProps) {
  const className = [
    "chip",
    `chip--${variant}`,
    isActive ? "chip--active" : "",
    asButton ? "chip--button" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (asButton) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {labels[category]}
      </button>
    );
  }

  return <span className={className}>{labels[category]}</span>;
}
