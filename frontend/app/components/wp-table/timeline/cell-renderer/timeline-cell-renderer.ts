import {WorkPackageResourceInterface} from "../../../api/api-v3/hal-resources/work-package-resource.service";
import {RenderInfo, calculatePositionValueForDayCount, timelineElementCssClass} from "../wp-timeline";
import {classNameLeftHandle, classNameRightHandle} from "../wp-timeline-cell-mouse-handler";
import MomentStatic = moment.MomentStatic;
import Moment = moment.Moment;

interface CellDateMovement {
  // Target values to move work package to
  startDate?: moment.Moment;
  dueDate?: moment.Moment;
}

export class TimelineCellRenderer {

  protected dateDisplaysOnMouseMove: {left?: HTMLElement; right?: HTMLElement} = {};

  public get type(): string {
    return 'bar';
  }

  public get fallbackColor(): string {
    return '#8CD1E8';
  }

  /**
   * Assign changed dates to the work package.
   * For generic work packages, assigns start and due date.
   *
   */
  public assignDateValues(wp: WorkPackageResourceInterface, dates: CellDateMovement) {
    this.assignDate(wp, 'startDate', dates.startDate);
    this.assignDate(wp, 'dueDate', dates.dueDate);

    this.updateLeftRightMovedLabel(dates.startDate, dates.dueDate);
  }

  /**
   * Restore the original date, if any was set.
   */
  public onCancel(wp: WorkPackageResourceInterface) {
    wp.restoreFromPristine('startDate');
    wp.restoreFromPristine('dueDate');
  }

  /**
   * Handle movement by <delta> days of the work package to either (or both) edge(s)
   * depending on which initial date was set.
   */
  public onDaysMoved(wp: WorkPackageResourceInterface, delta: number): CellDateMovement {
    const initialStartDate = wp.$pristine['startDate'];
    const initialDueDate = wp.$pristine['dueDate'];
    let dates: CellDateMovement = {};

    if (initialStartDate) {
      dates.startDate = moment(initialStartDate).add(delta, "days");
    }

    if (initialDueDate) {
      dates.dueDate = moment(initialDueDate).add(delta, "days");
    }

    // only start or due are changed
    if (_.keys(dates).length === 1) {
      if (dates.startDate != undefined && dates.startDate.isAfter(moment(wp.dueDate))) {
        dates.startDate = moment(wp.dueDate);
      } else if (dates.dueDate != undefined && dates.dueDate.isBefore(moment(wp.startDate))) {
        dates.dueDate = moment(wp.startDate);
      }
    }

    return dates;
  }

  public onMouseDown(ev: MouseEvent, renderInfo: RenderInfo, elem: HTMLElement): void {
    // Update the cursor and maybe set start/due values
    if (jQuery(ev.target).hasClass(classNameLeftHandle)) {
      // only left
      this.forceCursor('w-resize');
      if (renderInfo.workPackage.startDate === null) {
        renderInfo.workPackage.startDate = renderInfo.workPackage.dueDate;
      }
    } else if (jQuery(ev.target).hasClass(classNameRightHandle)) {
      // only right
      this.forceCursor('e-resize');
      if (renderInfo.workPackage.dueDate === null) {
        renderInfo.workPackage.dueDate = renderInfo.workPackage.startDate;
      }
    } else {
      // both
      this.forceCursor('ew-resize');
    }

    this.dateDisplaysOnMouseMove = [null, null];

    if (!jQuery(ev.target).hasClass(classNameRightHandle) && renderInfo.workPackage.startDate) {
      // create left date label
      const leftInfo = document.createElement("div");
      leftInfo.className = "leftDateDisplay";
      this.dateDisplaysOnMouseMove.left = leftInfo;
      elem.appendChild(leftInfo);

      renderInfo.workPackage.storePristine('startDate');
    }
    if (!jQuery(ev.target).hasClass(classNameLeftHandle) && renderInfo.workPackage.dueDate) {
      // create right date label
      const rightInfo = document.createElement("div");
      rightInfo.className = "rightDateDisplay";
      this.dateDisplaysOnMouseMove.right = rightInfo;
      elem.appendChild(rightInfo);

      renderInfo.workPackage.storePristine('dueDate');
    }

    this.updateLeftRightMovedLabel(
      moment(renderInfo.workPackage.startDate),
      moment(renderInfo.workPackage.dueDate));
  }

  public onMouseDownEnd() {
    this.dateDisplaysOnMouseMove.left && this.dateDisplaysOnMouseMove.left.remove();
    this.dateDisplaysOnMouseMove.right && this.dateDisplaysOnMouseMove.right.remove();
    this.dateDisplaysOnMouseMove = {};
  }

  /**
   * @return true, if the element should still be displayed.
   *         false, if the element must be removed from the timeline.
   */
  public update(element: HTMLDivElement, wp: WorkPackageResourceInterface, renderInfo: RenderInfo): boolean {
    // general settings - bar
    element.style.marginLeft = renderInfo.viewParams.scrollOffsetInPx + "px";
    element.style.backgroundColor = this.typeColor(renderInfo.workPackage);

    const viewParams = renderInfo.viewParams;
    let start = moment(wp.startDate as any);
    let due = moment(wp.dueDate as any);

    // only start date, fade out bar to the right
    if (_.isNaN(due.valueOf()) && !_.isNaN(start.valueOf())) {
      due = start.clone();//.add(1, "days");
      element.style.backgroundColor = "inherit";
      const color = this.typeColor(renderInfo.workPackage);
      element.style.backgroundImage = `linear-gradient(90deg, ${color} 0%, rgba(255,255,255,0) 80%)`;
    }

    // only due date, fade out bar to the left
    if (_.isNaN(start.valueOf()) && !_.isNaN(due.valueOf())) {
      start = due.clone();//.add(1, "days");
      element.style.backgroundColor = "inherit";
      const color = this.typeColor(renderInfo.workPackage);
      element.style.backgroundImage = `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${color} 100%)`;
    }

    // offset left
    const offsetStart = start.diff(viewParams.dateDisplayStart, "days");
    element.style.left = calculatePositionValueForDayCount(viewParams, offsetStart);

    // duration
    const duration = due.diff(start, "days") + 1;
    element.style.width = calculatePositionValueForDayCount(viewParams, duration);

    return true;
  }

  /**
   * Render the generic cell element, a bar spanning from
   * start to due date.
   */
  public render(renderInfo: RenderInfo): HTMLDivElement {
    const bar = document.createElement("div");
    const left = document.createElement("div");
    const right = document.createElement("div");

    bar.className = timelineElementCssClass + " " + this.type;
    left.className = classNameLeftHandle;
    right.className = classNameRightHandle;

    bar.appendChild(left);
    bar.appendChild(right);

    return bar;
  }

  protected typeColor(wp: WorkPackageResourceInterface): string {
    let type = wp.type.state.getCurrentValue();
    if (type && type.color) {
      return type.color;
    }

    return this.fallbackColor;
  }

  protected assignDate(wp: WorkPackageResourceInterface, attributeName: string, value: moment.Moment) {
    if (value) {
      wp[attributeName] = value.format("YYYY-MM-DD") as any;
    }
  }

  /**
   * Force the cursor to the given cursor type.
   */
  protected forceCursor(cursor: string) {
    jQuery(".hascontextmenu").css("cursor", cursor);
    jQuery("." + timelineElementCssClass).css("cursor", cursor);
  }

  private updateLeftRightMovedLabel(start: Moment, due: Moment) {
    if (this.dateDisplaysOnMouseMove.left && start) {
      this.dateDisplaysOnMouseMove.left.innerText = start.format("L");
    }

    if (this.dateDisplaysOnMouseMove.right && due) {
      this.dateDisplaysOnMouseMove.right.innerText = due.format("L");
    }
  }
}