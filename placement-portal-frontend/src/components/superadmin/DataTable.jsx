// DataTable — Generic data table component (§4.3).
// Columns passed as props, reused across Colleges List, Feature Requests,
// and Audit Log. Supports clickable rows with keyboard accessibility.
import EmptyState from "./EmptyState";

export default function DataTable({
  columns,        // [{ key, header, render?, className? }]
  data,           // array of row objects
  onRowClick,     // optional (row) => void — makes rows clickable
  emptyState,     // { icon, title, text, actionLabel, onAction }
  rowKeyField = "id",
}) {
  if (!data || data.length === 0) {
    if (emptyState) {
      return (
        <div className="cd-table-container">
          <EmptyState {...emptyState} />
        </div>
      );
    }
    return null;
  }

  const clickable = Boolean(onRowClick);

  return (
    <div className="cd-table-container">
      <table className="cd-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row[rowKeyField]}
              className={clickable ? "cd-table__row--clickable" : ""}
              onClick={clickable ? () => onRowClick(row) : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row); } }
                  : undefined
              }
              role={clickable ? "button" : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className || ""}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
