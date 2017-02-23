import {debugLog} from '../../../../helpers/debug_output';
import {injectorBridge} from '../../../angular/angular-injector-bridge.functions';
import {WorkPackageTable} from '../../wp-fast-table';
import {States} from '../../../states.service';
import {TableEventHandler} from '../table-handler-registry';
import {WorkPackageTableSelection} from '../../state/wp-table-selection.service';
import {rowClassName} from '../../builders/rows/single-row-builder';
import {tdClassName} from '../../builders/cell-builder';

export class RowClickHandler implements TableEventHandler {
  // Injections
  public states:States;
  public wpTableSelection:WorkPackageTableSelection;

  constructor() {
    injectorBridge(this);
  }

  public get EVENT() {
    return 'click.table.row';
  }

  public get SELECTOR() {
    return `.${rowClassName}`;
  }

  public handleEvent(table: WorkPackageTable, evt:JQueryEventObject) {
    let target = jQuery(evt.target);

    // Shortcut to any clicks within a cell
    // We don't want to handle these.
    if (target.parents(`.${tdClassName}`).length) {
      debugLog('Skipping click on inner cell');
      return;
    }

    // Locate the row from event
    let element = target.closest(this.SELECTOR);
    let row = table.rowObject(element.data('workPackageId'));

    // Ignore links
    if (target.is('a') || target.parent().is('a')) {
      return;
    }

    // The current row is the last selected work package
    // not matter what other rows are (de-)selected below.
    // Thus save that row for the details view button.
    this.states.focusedWorkPackage.put(row.workPackageId);

    // Update single selection if no modifier present
    if (!(evt.ctrlKey || evt.metaKey || evt.shiftKey)) {
      this.wpTableSelection.setSelection(row);
    }

    // Multiple selection if shift present
    if (evt.shiftKey) {
      this.wpTableSelection.setMultiSelectionFrom(table.rows, row);
    }

    // Single selection expansion if ctrl / cmd(mac)
    if (evt.ctrlKey || evt.metaKey) {
      this.wpTableSelection.toggleRow(row.workPackageId);
    }
  }
}

RowClickHandler.$inject = ['states', 'wpTableSelection'];
