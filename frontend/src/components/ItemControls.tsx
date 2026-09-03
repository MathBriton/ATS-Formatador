interface ItemControlsProps {
  index: number
  count: number
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  label?: string
}

/** Botões subir / descer / remover (reordenação da seção 3 do MVP). */
export default function ItemControls({ index, count, onMove, onRemove, label = 'item' }: ItemControlsProps) {
  return (
    <div className="item-controls">
      <button
        type="button"
        className="btn btn-icon btn-sm"
        title={`Mover ${label} para cima`}
        aria-label={`Mover ${label} para cima`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="btn btn-icon btn-sm"
        title={`Mover ${label} para baixo`}
        aria-label={`Mover ${label} para baixo`}
        disabled={index >= count - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
      <button
        type="button"
        className="btn btn-icon btn-sm btn-danger"
        title={`Remover ${label}`}
        aria-label={`Remover ${label}`}
        onClick={onRemove}
      >
        ✕
      </button>
    </div>
  )
}

