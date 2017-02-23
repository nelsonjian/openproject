import {WorkPackageTableMetadata} from '../../wp-table-metadata';
import {EditingRowBuilder} from './editing-row-builder';
import {States} from '../../../states.service';
import {SingleRowBuilder} from './single-row-builder';
import {WorkPackageTableColumnsService} from '../../state/wp-table-columns.service';
import {injectorBridge} from '../../../angular/angular-injector-bridge.functions';
import {WorkPackageTable} from '../../wp-fast-table';
import {WorkPackageTableRow} from '../../wp-table.interfaces';

export abstract class RowsBuilder {
  public states:States;

  protected rowBuilder:SingleRowBuilder;
  protected editingRowBuilder:EditingRowBuilder;

  constructor() {
    this.rowBuilder = new SingleRowBuilder();
    this.editingRowBuilder = new EditingRowBuilder();
  }

  /**
   * Build all rows of the table.
   */
  public abstract buildRows(table:WorkPackageTable):DocumentFragment;


  /**
   * Determine if this builder applies to the current view mode.
   */
  public isApplicable(table:WorkPackageTable, metaData:WorkPackageTableMetadata) {
    return true;
  }

  /**
   * Refresh a single row after structural changes.
   * Will perform dirty checking for when a work package is currently being edited.
   */
  public refreshRow(row:WorkPackageTableRow, table:WorkPackageTable):HTMLElement|null {
    let editing = this.states.editing.get(row.workPackageId).getCurrentValue();
    if (editing) {
      return this.editingRowBuilder.refreshEditing(row, editing);
    }

    return this.buildEmptyRow(row, table);
  }

  /**
   * Build an empty row for the given work package.
   */
  protected abstract buildEmptyRow(row:WorkPackageTableRow, table:WorkPackageTable):HTMLElement;
}

RowsBuilder.$inject = ['states'];
