/* eslint-disable no-underscore-dangle */
import { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { fromEvent, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

// This is an adapted version of the original FixedSizeVirtualScrollStrategy
// https://github.com/angular/components/blob/master/src/cdk/scrolling/fixed-size-virtual-scroll.ts
export class WindowVirtualScrollStrategy implements VirtualScrollStrategy {
  scrolledIndexChange: Observable<number>;

  private destroy$: Observable<void>;

  private _viewport: CdkVirtualScrollViewport | null = null;

  private _itemSizePx: number;
  private _offsetSizePx: number;
  private _minBufferPx: number;
  private _maxBufferPx: number;

  private readonly _scrolledIndexChange = new Subject<number>();
  private readonly destroy = new Subject<void>();

  constructor(itemSizePx: number, offsetSizePx: number, minBufferPx: number, maxBufferPx: number) {
    this._itemSizePx = itemSizePx;
    this._offsetSizePx = offsetSizePx;
    this._minBufferPx = minBufferPx;
    this._maxBufferPx = maxBufferPx;

    this.scrolledIndexChange = this._scrolledIndexChange.pipe(distinctUntilChanged());
    this.destroy$ = this.destroy.asObservable();
  }

  /**
   * Attaches this scroll strategy to a viewport.
   * @param viewport The viewport to attach this strategy to.
   */
  attach(viewport: CdkVirtualScrollViewport) {
    this._viewport = viewport;
    this._updateTotalContentSize();
    this._updateRenderedRange();

    fromEvent(window, 'scroll').pipe(takeUntil(this.destroy$)).subscribe(() => {
      this._updateRenderedRange();
    });
  }

  /** Detaches this scroll strategy from the currently attached viewport. */
  detach() {
    this._scrolledIndexChange.complete();
    this._viewport = null;

    this.destroy.next();
    this.destroy.complete();
  }

  /**
   * Update the item size and buffer size.
   * @param itemSize The size of the items in the virtually scrolling list.
   * @param minBufferPx The minimum amount of buffer (in pixels) before needing to render more
   * @param maxBufferPx The amount of buffer (in pixels) to render when rendering more.
   */
  updateItemAndBufferSize(
    itemSize: number,
    offsetSizePx: number,
    minBufferPx: number,
    maxBufferPx: number
  ) {
    this._itemSizePx = itemSize;
    this._offsetSizePx = offsetSizePx;
    this._minBufferPx = minBufferPx;
    this._maxBufferPx = maxBufferPx;

    this._updateTotalContentSize();
    this._updateRenderedRange();
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onContentScrolled() {
    this._updateRenderedRange();
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onDataLengthChanged() {
    this._updateTotalContentSize();
    this._updateRenderedRange();
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onContentRendered() {
    /* no-op */
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onRenderedOffsetChanged() {
    /* no-op */
  }

  /**
   * Scroll to the offset for the given index.
   * @param index The index of the element to scroll to.
   * @param behavior The ScrollBehavior to use when scrolling.
   */
  scrollToIndex(index: number, behavior: ScrollBehavior): void {
    if (this._viewport) {
      this._viewport.scrollToOffset(index * this._itemSizePx, behavior);
    }
  }

  /** Update the viewport's total content size. */
  private _updateTotalContentSize() {
    if (!this._viewport) {
      return;
    }

    this._viewport.setTotalContentSize(
      this._viewport.getDataLength() * this._itemSizePx + this._offsetSizePx
    );
  }

  /** Update the viewport's rendered range. */
  private _updateRenderedRange() {
    if (!this._viewport) {
      return;
    }

    // Use the window as a reference for viewPort size and offset
    const viewportSize = window.innerHeight;
    let scrollOffset = window.pageYOffset;

    const renderedRange = this._viewport.getRenderedRange();
    const newRange = { start: renderedRange.start, end: renderedRange.end };

    const dataLength = this._viewport.getDataLength();
    // Prevent NaN as result when dividing by zero.
    let firstVisibleIndex =
      this._itemSizePx > 0 ? scrollOffset / this._itemSizePx : 0;

    // If user scrolls to the bottom of the list and data changes to a smaller list
    if (newRange.end > dataLength) {
      // We have to recalculate the first visible index based on new data length and viewport size.
      const maxVisibleItems = Math.ceil(viewportSize / this._itemSizePx);
      const newVisibleIndex = Math.max(
        0,
        Math.min(firstVisibleIndex, dataLength - maxVisibleItems)
      );

      // If first visible index changed we must update scroll offset to handle start/end buffers
      // Current range must also be adjusted to cover the new position (bottom of new list).
      if (firstVisibleIndex !== newVisibleIndex) {
        firstVisibleIndex = newVisibleIndex;
        scrollOffset = newVisibleIndex * this._itemSizePx;
        newRange.start = Math.floor(firstVisibleIndex);
      }

      newRange.end = Math.max(
        0,
        Math.min(dataLength, newRange.start + maxVisibleItems)
      );
    }

    const startBuffer = scrollOffset - newRange.start * this._itemSizePx;
    if (startBuffer < this._minBufferPx && newRange.start !== 0) {
      const expandStart = Math.ceil(
        (this._maxBufferPx - startBuffer) / this._itemSizePx
      );
      newRange.start = Math.max(0, newRange.start - expandStart);
      newRange.end = Math.min(
        dataLength,
        Math.ceil(
          firstVisibleIndex +
            (viewportSize + this._minBufferPx) / this._itemSizePx
        )
      );
    } else {
      const endBuffer =
        newRange.end * this._itemSizePx - (scrollOffset + viewportSize);
      if (endBuffer < this._minBufferPx && newRange.end !== dataLength) {
        const expandEnd = Math.ceil(
          (this._maxBufferPx - endBuffer) / this._itemSizePx
        );
        if (expandEnd > 0) {
          newRange.end = Math.min(dataLength, newRange.end + expandEnd);
          newRange.start = Math.max(
            0,
            Math.floor(firstVisibleIndex - this._minBufferPx / this._itemSizePx)
          );
        }
      }
    }

    this._viewport.setRenderedRange(newRange);
    this._viewport.setRenderedContentOffset(this._itemSizePx * newRange.start);
    this._scrolledIndexChange.next(Math.floor(firstVisibleIndex));
  }
}
