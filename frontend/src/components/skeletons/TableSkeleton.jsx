import Skeleton from "./Skeleton";

function TableSkeleton({
  rows = 8,
  columns = 5,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

      {/* Header */}
      <div
        className="grid gap-6 border-b border-slate-200 bg-slate-50 px-6 py-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-4 w-24"
          />
        ))}
      </div>

      {/* Rows */}
      <div>
        {Array.from({ length: rows }).map((_, rowIndex) => (

          <div
            key={rowIndex}
            className="grid gap-6 border-b border-slate-100 px-6 py-5"
            style={{
              gridTemplateColumns:
                `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >

            {Array.from({
              length: columns,
            }).map((_, columnIndex) => (

              <Skeleton
                key={columnIndex}
                className={
                  columnIndex === 0
                    ? "h-4 w-32"
                    : "h-4 w-20"
                }
              />

            ))}

          </div>

        ))}
      </div>

    </div>
  );
}

export default TableSkeleton;