import {whenDebugging} from '../helpers/debug_output';
import {WorkPackageTable} from './wp-fast-table/wp-fast-table';
import {
  WorkPackageTableRow,
  WPTableHierarchyState,
  WPTableRowSelectionState
} from './wp-fast-table/wp-table.interfaces';
import {MultiState, initStates, State} from "../helpers/reactive-fassade";
import {WorkPackageResource} from "./api/api-v3/hal-resources/work-package-resource.service";
import {opServicesModule} from "../angular-modules";
import {SchemaResource} from './api/api-v3/hal-resources/schema-resource.service';
import {WorkPackageEditForm} from './wp-edit-form/work-package-edit-form';
import {WorkPackageTableMetadata} from './wp-fast-table/wp-table-metadata';
import {Subject} from 'rxjs';

export class States {

  workPackages = new MultiState<WorkPackageResource>();
  schemas = new MultiState<SchemaResource>();

  // Work package table states
  table = {
    // Metadata of the current table result
    // (page, links, grouping information)
    metadata: new State<WorkPackageTableMetadata>(),
    // Set of work package IDs in strict order of appearance
    rows: new State<WorkPackageResource[]>(),
    // Set of columns in strict order of appearance
    columns: new State<string[]>(),
    // Table row selection state
    selection: new State<WPTableRowSelectionState>(),
    // Current state of collapsed groups (if any)
    collapsedGroups: new State<{[identifier:string]: boolean}>(),
    // Hierarchies of table
    hierarchies: new State<WPTableHierarchyState>(),
    // State to be updated when the table is up to date
    rendered:new State<WorkPackageTable>(),
    // Subject used to unregister all listeners of states above.
    stopAllSubscriptions:new Subject()
  };

  // Query states
  query = {
    // All available columns for selection
    availableColumns: new State<any[]>()
  };

  // Current focused work package (e.g, row preselected for details button)
  focusedWorkPackage = new State<string>();

  // Open editing forms
  editing = new MultiState<WorkPackageEditForm>();

  constructor() {
    initStates(this, function (msg: any) {
      whenDebugging(() => {
        console.trace(msg);
      });
    });
  }

}

opServicesModule.service('states', States);
