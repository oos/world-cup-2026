export type TreemapInput = {
  id: string;
  value: number;
};

export type TreemapRect = TreemapInput & {
  x: number;
  y: number;
  width: number;
  height: number;
};

function worstRatio(row: TreemapInput[], length: number): number {
  if (row.length === 0 || length <= 0) return Infinity;
  const sum = row.reduce((total, item) => total + item.value, 0);
  let max = 0;
  let min = Infinity;
  for (const item of row) {
    max = Math.max(max, item.value);
    min = Math.min(min, item.value);
  }
  const sumSq = sum * sum;
  return Math.max((length * length * max) / sumSq, sumSq / (length * length * min));
}

function layoutRow(
  row: TreemapInput[],
  x: number,
  y: number,
  width: number,
  height: number,
  vertical: boolean
): TreemapRect[] {
  const sum = row.reduce((total, item) => total + item.value, 0);
  const rects: TreemapRect[] = [];
  let offset = 0;

  for (const item of row) {
    const fraction = item.value / sum;
    const rect: TreemapRect = {
      ...item,
      x,
      y,
      width,
      height,
    };

    if (vertical) {
      const rowHeight = height * fraction;
      rect.y = y + offset;
      rect.height = rowHeight;
      offset += rowHeight;
    } else {
      const rowWidth = width * fraction;
      rect.x = x + offset;
      rect.width = rowWidth;
      offset += rowWidth;
    }

    rects.push(rect);
  }

  return rects;
}

export function layoutTreemap(
  items: TreemapInput[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapRect[] {
  if (items.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  if (items.length === 1) {
    return [{ ...items[0], x, y, width, height }];
  }

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const vertical = width >= height;
  const length = vertical ? height : width;
  const rects: TreemapRect[] = [];
  let row: TreemapInput[] = [];
  let offset = 0;
  const total = sorted.reduce((sum, item) => sum + item.value, 0);

  const flushRow = () => {
    if (row.length === 0) return;
    const rowSum = row.reduce((sum, item) => sum + item.value, 0);
    const rowLength = (rowSum / total) * length;
    const rowRects = layoutRow(
      row,
      vertical ? x : x + offset,
      vertical ? y + offset : y,
      vertical ? width : rowLength,
      vertical ? rowLength : height,
      !vertical
    );
    rects.push(...rowRects);
    offset += rowLength;
    row = [];
  };

  for (const item of sorted) {
    const nextRow = [...row, item];
    if (row.length === 0 || worstRatio(row, length) >= worstRatio(nextRow, length)) {
      row = nextRow;
    } else {
      flushRow();
      row = [item];
    }
  }
  flushRow();

  return rects;
}
