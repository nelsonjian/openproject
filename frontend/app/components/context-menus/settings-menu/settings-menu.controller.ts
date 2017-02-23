// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
//++

import {opWorkPackagesModule} from '../../../angular-modules';
import {ContextMenuService} from '../context-menu.service';
import {WorkPackageTableHierarchyService} from '../../wp-fast-table/state/wp-table-hierarchy.service';

interface IMyScope extends ng.IScope {
  displaySumsLabel:string;
  displayHierarchies:boolean;
  saveQuery:Function;
  deleteQuery:Function;
  query:op.Query;

  showSaveAsModal:Function;
  showShareModal:Function;
  showSettingsModal:Function;
  showExportModal:Function;
  showColumnsModal:Function;
  showGroupingModal:Function;
  showSortingModal:Function;
  toggleDisplaySums:Function;
  toggleHierarchies:Function;
  showSettingsModalInvalid:Function;
  showShareModalInvalid:Function;
  showExportModalInvalid:Function;
  deleteQueryInvalid:Function;
  showSaveModalInvalid:Function;
  saveQueryInvalid:Function;

}

function SettingsDropdownMenuController($scope:IMyScope,
                                        $window:ng.IWindowService,
                                        $state:ng.ui.IStateService,
                                        $timeout:ng.ITimeoutService,
                                        I18n:op.I18n,
                                        columnsModal:any,
                                        exportModal:any,
                                        saveModal:any,
                                        settingsModal:any,
                                        shareModal:any,
                                        sortingModal:any,
                                        groupingModal:any,
                                        contextMenu:ContextMenuService,
                                        wpTableHierarchy:WorkPackageTableHierarchyService,
                                        QueryService:any,
                                        AuthorisationService:any,
                                        NotificationsService:any) {

  $scope.displayHierarchies = wpTableHierarchy.isEnabled;
  $scope.$watch('query.displaySums', function (newValue) {
    $scope.displaySumsLabel = (newValue) ? I18n.t('js.toolbar.settings.hide_sums')
      : I18n.t('js.toolbar.settings.display_sums');
  });

  $scope.saveQuery = function (event:JQueryEventObject) {
    event.stopPropagation();
    if (!$scope.query.isDirty()) {
      return;
    }
    if ($scope.query.isNew()) {
      if (allowQueryAction(event, 'create')) {
        closeAnyContextMenu();
        saveModal.activate();
      }
    } else {
      if (allowQueryAction(event, 'update')) {
        QueryService.saveQuery()
          .then(function (data:any) {
            if (data.status.isError) {
              NotificationsService.addError(data.status.text);
            }
            else {
              NotificationsService.addSuccess(data.status.text);
              $state.go('work-packages.list',
                {'query_id': $scope.query.id, 'query_props': null},
                {notify: false});
            }
          });
      }
    }
  };

  $scope.deleteQuery = function (event:JQueryEventObject) {
    event.stopPropagation();
    if (allowQueryAction(event, 'delete') && preventNewQueryAction(event) && deleteConfirmed()) {
      QueryService.deleteQuery()
        .then(function (data:any) {
          if (data.status.isError) {
            NotificationsService.addError(data.status.text);
          }
          else {
            NotificationsService.addSuccess(data.status.text);
            $state.go('work-packages.list',
              {'query_id': null, 'query_props': null},
              {reload: true});
          }
        });
    }
  };

  // Modals
  $scope.showSaveAsModal = function (event:JQueryEventObject) {
    event.stopPropagation();
    if (allowQueryAction(event, 'create')) {
      showExistingQueryModal.call(saveModal, event);
      updateFocusInModal('save-query-name');
    }
  };

  $scope.showShareModal = function (event:JQueryEventObject) {
    event.stopPropagation();
    if (allowQueryAction(event, 'publicize') || allowQueryAction(event, 'star')) {
      showExistingQueryModal.call(shareModal, event);
      updateFocusInModal('show-public');
    }
  };

  $scope.showSettingsModal = function (event:JQueryEventObject) {
    event.stopPropagation();
    if (allowQueryAction(event, 'update')) {
      showExistingQueryModal.call(settingsModal, event);
      updateFocusInModal('query_name');
    }
  };

  $scope.showExportModal = function (event:JQueryEventObject) {
    event.stopPropagation();
    if (allowWorkPackageAction(event, 'export')) {
      showModal.call(exportModal);
      setTimeout(function () {
        updateFocusInModal(jQuery("[id^='export-']").first().attr('id'));
      });
    }
  };

  $scope.showColumnsModal = function (event:JQueryEventObject) {
    event.stopPropagation();
    showModal.call(columnsModal);
    setTimeout(function () {
      updateFocusInModal(jQuery("[id^='column-']").first().attr('id'));
    });
  };

  $scope.showGroupingModal = function (event:JQueryEventObject) {
    if ($scope.displayHierarchies) {
      return;
    }

    event.stopPropagation();
    showModal.call(groupingModal);
    updateFocusInModal('selected_columns_new');
  };

  $scope.showSortingModal = function (event:JQueryEventObject) {
    event.stopPropagation();
    showModal.call(sortingModal);
    updateFocusInModal('modal-sorting-attribute-0');
  };

  $scope.toggleHierarchies = function () {
    if (!!$scope.query.groupBy) {
      return;
    }

    const isEnabled = wpTableHierarchy.isEnabled;
    wpTableHierarchy.setEnabled(!isEnabled);
  };

  $scope.toggleDisplaySums = function () {
    closeAnyContextMenu();
    $scope.query.displaySums = !$scope.query.displaySums;

    // This eventually calls the resize event handler defined in the
    // WorkPackagesTable directive and ensures that the sum row at the
    // table footer is properly displayed.
    angular.element($window).trigger('resize');
  };

  $scope.showSettingsModalInvalid = function () {
    return AuthorisationService.cannot('query', 'update');
  };

  $scope.showShareModalInvalid = function () {
    return (AuthorisationService.cannot('query', 'publicize') &&
    AuthorisationService.cannot('query', 'star'));
  };

  $scope.showExportModalInvalid = function () {
    return AuthorisationService.cannot('work_package', 'export');
  };

  $scope.deleteQueryInvalid = function () {
    return AuthorisationService.cannot('query', 'delete');
  };

  $scope.showSaveModalInvalid = function () {
    return $scope.query.isNew() || AuthorisationService.cannot('query', 'create');
  };

  $scope.saveQueryInvalid = function () {
    return (!$scope.query.isDirty()) ||
      (
        $scope.query.isDirty() && !$scope.query.isNew() &&
        AuthorisationService.cannot('query', 'update')
      ) ||
      ($scope.query.isNew() && AuthorisationService.cannot('query', 'create'));
  };

  function preventNewQueryAction(event:JQueryEventObject) {
    if (event && $scope.query.isNew()) {
      event.stopPropagation();
      return false;
    }
    return true;
  }

  function showModal(this:any) {
    closeAnyContextMenu();
    this.activate();
  }

  function showExistingQueryModal(this:any, event:JQueryEventObject) {
    if (preventNewQueryAction(event)) {
      closeAnyContextMenu();
      this.activate();
    }
  }

  function allowQueryAction(event:JQueryEventObject, action:any) {
    return allowAction(event, 'query', action);
  }

  function allowWorkPackageAction(event:JQueryEventObject, action:any) {
    return allowAction(event, 'work_package', action);
  }

  function allowAction(event:JQueryEventObject, modelName:string, action:any) {
    if (AuthorisationService.can(modelName, action)) {
      return true;
    } else {
      event.stopPropagation();
      return false;
    }
  }

  function closeAnyContextMenu() {
    contextMenu.close();
  }

  function deleteConfirmed() {
    return $window.confirm(I18n.t('js.text_query_destroy_confirmation'));
  }

  function updateFocusInModal(element_id:string) {
    setTimeout(function () {
      jQuery('#' + element_id).focus();
    }, 100);
  }
}

opWorkPackagesModule.controller('SettingsDropdownMenuController', SettingsDropdownMenuController);
