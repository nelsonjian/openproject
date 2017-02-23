import {WorkPackageTableMetadata} from '../../wp-table-metadata';
import {RowsBuilder} from './rows-builder';
import {States} from '../../../states.service';
import {injectorBridge} from '../../../angular/angular-injector-bridge.functions';
import {groupedRowClassName} from '../../helpers/wp-table-row-helpers';
import {WorkPackageTableColumnsService} from '../../state/wp-table-columns.service';
import {WorkPackageTable} from '../../wp-fast-table';
import {SingleRowBuilder} from './single-row-builder';
import {WorkPackageResource} from '../../../api/api-v3/hal-resources/work-package-resource.service';
import {GroupObject, WorkPackageTableRow} from '../../wp-table.interfaces';

export const rowGroupClassName = 'wp-table--group-header';
export const collapsedRowClass = '-collapsed';

export class GroupedRowsBuilder extends RowsBuilder {
  // Injections
  public states:States;
  public wpTableColumns:WorkPackageTableColumnsService;
  public I18n:op.I18n;

  private text:any;

  constructor() {
    super();
    injectorBridge(this);

    this.text = {
      collapse: this.I18n.t('js.label_collapse'),
      expand: this.I18n.t('js.label_expand'),
    };
  }

  /**
   * The hierarchy builder is only applicable if the hierachy mode is active
   */
  public isApplicable(table:WorkPackageTable, metaData:WorkPackageTableMetadata) {
    return !!metaData.groupBy;
  }

  /**
   * Rebuild the entire grouped tbody from the given table
   * @param table
   */
  public buildRows(table:WorkPackageTable) {
    const metaData = table.metaData as WorkPackageTableMetadata;
    const groupBy = metaData.groupBy as string;
    const groups = this.getGroupData(groupBy, metaData.groups);

    // Remember the colspan for the group rows from the current column count
    // and add one for the details link.
    let colspan = this.wpTableColumns.columnCount + 1;
    let tbodyContent = document.createDocumentFragment();

    let currentGroup:GroupObject|null = null;
    table.rows.forEach((wpId:string) => {
      let row = table.rowIndex[wpId];
      let nextGroup = this.matchingGroup(row.object, groups, groupBy);

      if (currentGroup !== nextGroup) {
        tbodyContent.appendChild(this.buildGroupRow(nextGroup, colspan));
        currentGroup = nextGroup;
      }

      row.group = currentGroup;
      let tr = this.buildSingleRow(row);
      tbodyContent.appendChild(tr);
    });

    return tbodyContent;
  }

  /**
   * Find a matching group for the given work package.
   * The API sadly doesn't provide us with the information which group a WP belongs to.
   */
  private matchingGroup(workPackage:WorkPackageResource, groups:GroupObject[], groupBy:string) {
    return _.find(groups, (group:GroupObject) => {
      // If its a linked resource, compare the href,
      // which is an array of links the resource offers
      if (group.href && group.href.length) {
        // Compare array of hrefs with the given group
        let attr:any = workPackage.$source._links[groupBy];
        if (!_.isArray(attr)) {
          attr = [{ href: attr.href }];
        }

        let equal = true;
        group.href.forEach((l:any):any => {
          if(!_.find(attr, (el:any) => el.href === l.href)) {
            return equal = false;
          }
        });

        return equal;
      }

      // Otherwise, fall back to simple value comparison.
      let value = group.value === '' ? null : group.value;
      return value === workPackage[groupBy];
    }) as GroupObject;
  }

  /**
   * Refresh the group expansion state
   */
  public refreshExpansionState(table:WorkPackageTable) {
    const metaData = table.metaData as WorkPackageTableMetadata;
    const groups = this.getGroupData(metaData.groupBy as string, metaData.groups);
    const colspan = this.wpTableColumns.columnCount + 1;

    jQuery(`.${rowGroupClassName}`).each((i:number, oldRow:HTMLElement) => {
      let groupIndex = jQuery(oldRow).data('groupIndex');
      let group = groups[groupIndex];

      // Set expansion state of contained rows
      jQuery(`.${groupedRowClassName(groupIndex)}`).toggleClass(collapsedRowClass, group.collapsed);

      // Refresh the group header
      let newRow = this.buildGroupRow(group, colspan);

      if (oldRow.parentNode) {
        oldRow.parentNode.replaceChild(newRow, oldRow);
      }
    });
  }

  /**
   * Augment the given groups with the current collapsed state data.
   */
  public getGroupData(groupBy:string, groups:GroupObject[]) {
    let collapsedState = this.states.table.collapsedGroups.getCurrentValue() || {};

    return groups.map((group:GroupObject, index:number) => {
      group.index = index;
      if (group._links && group._links.valueLink) {
        group.href = group._links.valueLink;
      }
      group.identifier = this.groupIdentifier(groupBy, group);
      group.collapsed = collapsedState[group.identifier] === true;
      return group;
    });
  }

  /**
   * Redraw a single row, while maintain its group state.
   */
  public buildEmptyRow(row:WorkPackageTableRow, table:WorkPackageTable):HTMLElement {
    return this.buildSingleRow(row);
  }

  public groupIdentifier(groupBy:string, group:GroupObject) {
    return `${groupBy}-${group.value || 'nullValue'}`;
  }

  /**
   * Enhance a row from the rowBuilder with group information.
   */
  private buildSingleRow(row:WorkPackageTableRow):HTMLElement {
    // Do not re-render rows before their grouping data
    // is completed after the first try
    if (!row.group) {
      return row.element as HTMLElement;
    }

    const group = row.group as GroupObject;
    let tr = this.rowBuilder.buildEmpty(row.object);
    tr.classList.add(groupedRowClassName(group.index));

    if (row.group.collapsed) {
      tr.classList.add(collapsedRowClass);
    }

    row.element = tr;
    return tr;
  }

  /**
   * Build group header row
   */
  private buildGroupRow(group:GroupObject, colspan:number) {
    let row = document.createElement('tr');
    let togglerIconClass, text;

    if (group.collapsed) {
      text = this.text.expand;
      togglerIconClass = 'icon-plus';
    } else {
      text = this.text.collapse;
      togglerIconClass = 'icon-minus2';
    }

    row.classList.add(rowGroupClassName);
    row.id = `wp-table-rowgroup-${group.index}`;
    row.dataset['groupIndex'] = group.index.toString();
    row.dataset['groupIdentifier'] = group.identifier;
    row.innerHTML = `
      <td colspan="${colspan}">
        <div class="expander icon-context ${togglerIconClass}">
          <span class="hidden-for-sighted">${_.escape(text)}</span>
        </div>
        <div class="group--value">
          ${_.escape(this.groupName(group))}
          <span class="count">
            (${group.count})
          </span>
        </div>
      </td>
    `;

    return row;
  }

  private groupName(group:GroupObject) {
    let value = group.value;
    if (value === null) {
      return '-';
    } else {
      return value;
    }
  }
}


GroupedRowsBuilder.$inject = ['wpTableColumns', 'states', 'I18n'];
