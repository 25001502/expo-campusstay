import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { AttachmentSource, PickedDocument, PickerResult } from './attachmentSession';
import { DocumentIssue } from './documents';
import { normalizeImageAttachment } from './imageAttachments';

const options: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'], allowsEditing: false, allowsMultipleSelection: false,
  quality: 1, base64: false, exif: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
};
function normalize(result: ImagePicker.ImagePickerResult, discard: (asset: PickedDocument) => void): PickerResult {
  if (result.canceled) return { canceled: true };
  try { return { canceled: false, assets: result.assets.map(normalizeImageAttachment) }; }
  catch (error) { for (const asset of result.assets) discard({ uri: asset.uri }); throw error; }
}
export async function pickNativeImage(source: Exclude<AttachmentSource, 'files'>, discard: (asset: PickedDocument) => void): Promise<PickerResult> {
  try {
    // A recovered Android result cannot safely be attributed to a draft/category
    // after activity/process recreation: discard it rather than attach it elsewhere.
    if (Platform.OS === 'android') {
      const abandoned = await ImagePicker.getPendingResultAsync();
      if (abandoned && 'assets' in abandoned) for (const asset of abandoned.assets ?? []) discard({ uri: asset.uri });
    }
    if (source === 'camera') {
      let permission = await ImagePicker.getCameraPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new DocumentIssue('cameraPermission');
      return normalize(await ImagePicker.launchCameraAsync(options), discard);
    }
    // Modern system image selection needs no full-library permission request.
    return normalize(await ImagePicker.launchImageLibraryAsync(options), discard);
  } catch (error) {
    if (error instanceof DocumentIssue) throw error;
    throw new DocumentIssue(source === 'camera' ? 'camera' : 'library');
  }
}
