"use client";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
};

type Props = {
  products: Product[];
  storeMode?: "moira" | "days";
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
};

const moiraCategories = [
  "同伴",
  "キャストドリンク",
  "ショット",
  "シャンパン",
  "ボトル",
  "イベント",
  "単品",
];

const moiraCollapsible = [
  "シャンパン",
  "ボトル",
  "イベント",
  "単品",
];

const daysProducts: Product[] = [
  { id: "days-system-nomihodai-60", name: "飲み放題60分", category: "SYSTEM", price: 2500 },
  { id: "days-system-extension-60", name: "延長60分", category: "SYSTEM", price: 1000 },
  { id: "days-system-unlimited", name: "無制限", category: "SYSTEM", price: 4000 },
  { id: "days-system-charge-60", name: "チャージ60分", category: "SYSTEM", price: 500 },
  ...[500, 600, 800, 1000, 1200, 1500, 2000, 2500].map((price) => ({
    id: `days-alcohol-${price}`,
    name: `アルコール${price}`,
    category: "アルコール",
    price,
  })),
  { id: "days-event-ferris-wheel-12", name: "観覧車12杯", category: "イベント", price: 12000 },
  { id: "days-event-ferris-wheel-anejo", name: "観覧車アネホ", category: "イベント", price: 17000 },
  { id: "days-event-heart-24", name: "ハート24杯", category: "イベント", price: 24000 },
  { id: "days-event-heart-anejo", name: "ハートアネホ", category: "イベント", price: 32000 },
  { id: "days-event-roulette-16", name: "ルーレット16杯", category: "イベント", price: 15000 },
  { id: "days-event-roulette-anejo", name: "ルーレットアネホ", category: "イベント", price: 21000 },
  { id: "days-staff-drink", name: "Drink", category: "スタッフドリンク", price: 1000 },
  { id: "days-staff-shot", name: "Shot", category: "スタッフドリンク", price: 1200 },
  { id: "days-staff-mega", name: "Mega", category: "スタッフドリンク", price: 3500 },
  { id: "days-staff-coca-bomb", name: "CocaBomb", category: "スタッフドリンク", price: 1500 },
  { id: "days-staff-1800-anejo", name: "1800アネホ", category: "スタッフドリンク", price: 2000 },
];

const daysCategories = ["SYSTEM", "アルコール", "イベント", "スタッフドリンク"];
function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

export default function OrderModal({
  products,
  storeMode = "moira",
  onSelectProduct,
  onClose,
}: Props) {
  const displayedProducts = storeMode === "days" ? daysProducts : products;
  const categories = storeMode === "days" ? daysCategories : moiraCategories;
  const collapsible = storeMode === "days" ? ["イベント"] : moiraCollapsible;

  function renderProducts(category: string) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {displayedProducts
          .filter((product) => product.category === category)
          .map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelectProduct(product)}
              className="min-h-28 rounded-2xl bg-purple-700 p-4 text-left shadow-lg active:scale-95"
            >
              <p className="text-lg font-bold">{product.name}</p>
              <p className="mt-3 text-2xl font-black">
                {product.id === "manualSingle" ? "金額を入力" : formatYen(product.price)}
              </p>

              {(category === "同伴" ||
                category === "キャストドリンク" ||
                category === "シャンパン" ||
                category === "イベント") && (
                <p className="mt-2 rounded-lg bg-pink-700 px-2 py-1 text-center text-sm font-bold">
                  {category === "イベント"
                    ? "杯数・代表者を入力"
                    : "スタッフを選択"}
                </p>
              )}
            </button>
          ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4">
      <div className="mx-auto my-4 w-full max-w-5xl rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">注文追加</h2>
            <p className="mt-2 text-slate-400">
              商品を押して伝票へ追加
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-3 text-lg font-bold"
          >
            閉じる
          </button>
        </div>

        <div className="mt-7 space-y-6">
          {categories.map((category) => {
            const hasProducts = displayedProducts.some(
              (product) => product.category === category,
            );

            if (!hasProducts) return null;

            if (collapsible.includes(category)) {
              return (
                <details
                  key={category}
                  className="rounded-2xl bg-slate-800"
                >
                  <summary className="cursor-pointer rounded-2xl p-5 text-2xl font-bold">
                    <span className="flex justify-between">
                      <span>{category}</span>
                      <span className="text-base text-slate-400">
                        タップして開く
                      </span>
                    </span>
                  </summary>

                  <div className="border-t border-slate-700 p-4">
                    {renderProducts(category)}
                  </div>
                </details>
              );
            }

            return (
              <section key={category}>
                <h3 className="mb-3 text-2xl font-bold">
                  {category}
                </h3>
                {renderProducts(category)}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
