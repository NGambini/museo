import path from 'node:path';
import { ComponentLoader } from 'adminjs';
import { componentsDir } from '../config/paths.js';

export const componentLoader = new ComponentLoader();

export const Components = {
  AttributesEditor: componentLoader.add(
    'AttributesEditor',
    path.join(componentsDir, 'attributes-editor'),
  ),
  AttributesShow: componentLoader.add(
    'AttributesShow',
    path.join(componentsDir, 'attributes-show'),
  ),
  GeneratePage: componentLoader.add(
    'GeneratePage',
    path.join(componentsDir, 'generate-page'),
  ),
  Dashboard: componentLoader.add(
    'Dashboard',
    path.join(componentsDir, 'dashboard'),
  ),
} as const;
