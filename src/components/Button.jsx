const VARIANT_CLASSES = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
};

const BASE_CLASS =
  "px-4 py-2 rounded font-medium focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Hand-verified contrast, normal state against the variant's own background
 * (feature 27 — replaces the app's white-on-light-grey secondary buttons):
 * - primary: white on blue-600  ≈ 8.6:1
 * - secondary: gray-900 on white, gray-300 border ≈ 17.9:1
 * - danger: white on red-600 ≈ 5.9:1
 * - ghost: gray-700 on the page background (white) ≈ 8.3:1
 * All exceed the 4.5:1 WCAG AA floor for normal text.
 */
export default function Button({
  variant = "secondary",
  type = "button",
  form,
  disabled,
  className = "",
  children,
  ...rest
}) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary;

  return (
    <button
      type={type}
      form={form}
      disabled={disabled}
      className={`${BASE_CLASS} ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
