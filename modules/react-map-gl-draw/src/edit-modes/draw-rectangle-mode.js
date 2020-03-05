// @flow

import type {
  Feature,
  ClickEvent,
  FeatureCollection,
  StopDraggingEvent
} from '@nebula.gl/edit-modes';
import uuid from 'uuid/v1';
import type { ModeProps } from '../types';

import { EDIT_TYPE, GEOJSON_TYPE, GUIDE_TYPE, RENDER_TYPE } from '../constants';
import BaseMode from './base-mode';
import { getFeatureCoordinates, updateRectanglePosition } from './utils';

export default class DrawRectangleMode extends BaseMode {
  _initTentativeFeature = (event: ClickEvent, props: ModeProps<FeatureCollection>) => {
    this.setTentativeFeature({
      type: 'Feature',
      properties: {
        // TODO deprecate id
        id: uuid(),
        renderType: RENDER_TYPE.RECTANGLE,
        guideType: GUIDE_TYPE.TENTATIVE
      },
      geometry: {
        type: 'LineString',
        coordinates: [event.mapCoords, event.mapCoords, event.mapCoords, event.mapCoords]
      }
    });
  };

  _commitTentativeFeature = (event: ClickEvent, props: ModeProps<FeatureCollection>) => {
    // close rectangle and commit
    const { data } = props;
    const tentativeFeature = this.getTentativeFeature();
    // clear guides
    this.setTentativeFeature(null);

    let coordinates = updateRectanglePosition(tentativeFeature, 2, event.mapCoords);
    if (!coordinates) {
      return;
    }

    // close rectangle
    coordinates = [...coordinates, coordinates[0]];

    const nextTentativeFeature = {
      type: 'Feature',
      properties: {
        // TODO deprecate id
        id: tentativeFeature.properties.id,
        renderType: RENDER_TYPE.RECTANGLE
      },
      geometry: {
        type: GEOJSON_TYPE.POLYGON,
        coordinates: [coordinates]
      }
    };

    const updatedData = data.addFeature(nextTentativeFeature).getObject();

    // commit rectangle
    props.onEdit({
      editType: EDIT_TYPE.ADD_FEATURE,
      updatedData,
      editContext: null
    });
  };

  handleClick = (event: ClickEvent, props: ModeProps<FeatureCollection>) => {};

  handleStartDragging = (event: StartDraggingEvent, props: ModeProps<FeatureCollection>) => {
    const tentativeFeature = this.getTentativeFeature();
    if (!tentativeFeature) {
      this._initTentativeFeature(event, props);
    }
  };

  handleStopDragging = (event: StopDraggingEvent, props: ModeProps<FeatureCollection>) => {
    const tentativeFeature = this.getTentativeFeature();
    if (tentativeFeature) {
      this._commitTentativeFeature(event, props);
    }
  };

  handlePan = (event: StartDraggingEvent, props: ModeProps<FeatureCollection>) => {
    const tentativeFeature = this.getTentativeFeature();
    if (tentativeFeature) {
      event.sourceEvent.stopImmediatePropagation();
    }
  };

  getEditHandlesFromFeature = (feature: Feature, featureIndex: ?number) => {
    const coordinates = getFeatureCoordinates(feature);
    return (
      coordinates &&
      coordinates.map((coord, i) => {
        return {
          type: 'Feature',
          properties: {
            // TODO remove renderType
            renderType: RENDER_TYPE.RECTANGLE,
            guideType: GUIDE_TYPE.CURSOR_EDIT_HANDLE,
            featureIndex,
            positionIndexes: [i]
          },
          geometry: {
            type: GEOJSON_TYPE.POINT,
            coordinates: [coord]
          }
        };
      })
    );
  };

  getGuides = (props: ModeProps<FeatureCollection>) => {
    let tentativeFeature = this.getTentativeFeature();
    const coordinates = getFeatureCoordinates(tentativeFeature);

    if (!coordinates) {
      return null;
    }

    const event = props.lastPointerMoveEvent;
    // update tentative feature
    const newCoordinates = updateRectanglePosition(tentativeFeature, 2, event.mapCoords);

    tentativeFeature = {
      type: 'Feature',
      properties: {
        // TODO deprecate id and renderType
        id: uuid(),
        guideType: GUIDE_TYPE.TENTATIVE,
        renderType: RENDER_TYPE.RECTANGLE
      },
      geometry: {
        type: GEOJSON_TYPE.LINE_STRING,
        coordinates: newCoordinates
      }
    };

    const editHandles = this.getEditHandlesFromFeature(tentativeFeature);

    return {
      tentativeFeature,
      editHandles
    };
  };
}
