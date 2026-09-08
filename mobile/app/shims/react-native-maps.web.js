// Stub for react-native-maps on web platform
import React from 'react';
import { View } from 'react-native';

export const PROVIDER_DEFAULT = 'google';
export const PROVIDER_GOOGLE = 'google';

const StubComponent = ({ children, style }) => React.createElement(View, { style }, children);

export default StubComponent;
export const MapView = StubComponent;
export const Marker = StubComponent;
export const Circle = StubComponent;
export const Polyline = StubComponent;
export const Polygon = StubComponent;
