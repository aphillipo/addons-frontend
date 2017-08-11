import SagaTester from 'redux-saga-tester';

import { loadEntities } from 'core/actions';
import { ErrorHandler } from 'core/errorHandler';
import addonsReducer from 'core/reducers/addons';
import apiReducer from 'core/reducers/api';
import * as api from 'disco/api';
import { getDiscoResults, loadDiscoResults } from 'disco/actions';
import discoResultsReducer from 'disco/reducers/discoResults';
import discoSaga from 'disco/sagas/disco';
import { dispatchSignInActions } from 'tests/unit/amo/helpers';
import {
  createFetchDiscoveryResult, fakeDiscoAddon,
} from 'tests/unit/disco/helpers';


describe(__filename, () => {
  describe('fetchDiscoveryAddons', () => {
    let apiState;
    let errorHandler;
    let mockApi;
    let sagaTester;

    beforeEach(() => {
      errorHandler = new ErrorHandler({
        id: 'some-error-handler',
        dispatch: sinon.stub(),
      });
      mockApi = sinon.mock(api);

      const { state } = dispatchSignInActions();
      apiState = state.api;
      sagaTester = new SagaTester({
        initialState: state,
        reducers: {
          addons: addonsReducer,
          api: apiReducer,
          discoResults: discoResultsReducer,
        },
      });

      sagaTester.start(discoSaga);
    });

    function _getDiscoResults(overrides = {}) {
      sagaTester.dispatch(getDiscoResults({
        errorHandlerId: errorHandler.id,
        ...overrides,
      }));
    }

    it('fetches landing page addons from the API', async () => {
      const addon1 = {
        heading: 'Discovery Addon 1',
        description: 'informative text',
        addon: {
          ...fakeDiscoAddon,
          guid: '@guid1',
          slug: 'discovery-addon-1',
        },
      };
      const addon2 = {
        heading: 'Discovery Addon 1',
        description: 'informative text',
        addon: {
          ...fakeDiscoAddon,
          guid: '@guid2',
          slug: 'discovery-addon-2',
        },
      };
      const addonResponse = createFetchDiscoveryResult([addon1, addon2]);
      mockApi
        .expects('getDiscoveryAddons')
        .withArgs({ api: apiState })
        .returns(Promise.resolve(addonResponse));

      const { entities, result } = addonResponse;
      const expectedLoadAction = loadDiscoResults({ entities, result });

      _getDiscoResults();

      await sagaTester.waitFor(expectedLoadAction.type);
      mockApi.verify();

      const calledActions = sagaTester.getCalledActions();

      expect(calledActions[1]).toEqual(loadEntities(entities));
      expect(calledActions[2]).toEqual(expectedLoadAction);
    });

    it('dispatches an error', async () => {
      const error = new Error('some API error maybe');
      mockApi.expects('getDiscoveryAddons').returns(Promise.reject(error));

      _getDiscoResults();

      const errorAction = errorHandler.createErrorAction(error);
      await sagaTester.waitFor(errorAction.type);

      const calledActions = sagaTester.getCalledActions();
      expect(calledActions[1]).toEqual(errorAction);
    });
  });
});