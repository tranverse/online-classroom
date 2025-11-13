import React from "react";

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  total = 0,
  page = 1,
  pageSize = 10,
  loading = false,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  // guard against invalid numbers coming from parent
  const safeTotal = Number.isFinite(total) ? total : 0;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, colIndex) => (
                <th
                  key={`${column.key.toString()}-${colIndex}`}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={`${
                        item.id || index
                      }-${column.key.toString()}-${colIndex}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {column.render
                        ? column.render(item)
                        : String(item[column.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {Math.min((safePage - 1) * safePageSize + 1, safeTotal)}
              </span>{" "}
              -{" "}
              <span className="font-medium">
                {Math.min(safePage * safePageSize, safeTotal)}
              </span>{" "}
              of <span className="font-medium">{safeTotal}</span> results
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div> */}
    </div>
  );
}
