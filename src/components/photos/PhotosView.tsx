/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProgressPhoto, PhotoType, WeighIn, BodyMeasurement } from '../../types';
import { Camera, Plus, Trash2, SplitSquareVertical, Sparkles, ShieldCheck, Info } from 'lucide-react';
import { Modal } from '../common/Modal';

interface PhotosViewProps {
  photos: ProgressPhoto[];
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  onAddPhoto: (photo: ProgressPhoto) => void;
  onDeletePhoto: (id: string) => void;
  autoOpenUpload?: boolean;
  onResetAutoOpenUpload?: () => void;
}

export const PhotosView: React.FC<PhotosViewProps> = ({
  photos,
  weighIns,
  measurements,
  onAddPhoto,
  onDeletePhoto,
  autoOpenUpload,
  onResetAutoOpenUpload,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(!!autoOpenUpload);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (autoOpenUpload) {
      setIsUploadOpen(true);
      onResetAutoOpenUpload?.();
    }
  }, [autoOpenUpload, onResetAutoOpenUpload]);

  // Upload Form states
  const [photoType, setPhotoType] = useState<PhotoType>('frontal');
  const [stageTag, setStageTag] = useState<'inicio' | 'seguimiento' | 'meta_visual'>('seguimiento');
  const [photoDate, setPhotoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [isReference, setIsReference] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Comparison states
  const [photoAId, setPhotoAId] = useState<string>(photos[0]?.id || '');
  const [photoBId, setPhotoBId] = useState<string>(photos[1]?.id || photos[0]?.id || '');

  // Handle local image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize image to max 1200px to keep localStorage light
        const canvas = document.createElement('canvas');
        const maxDimension = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        setImageDataUrl(compressed);
        setUploadError('');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageDataUrl) {
      setUploadError('Por favor carga una imagen desde tu dispositivo.');
      return;
    }

    // Match weight and waist on that date
    const matchedWeighIn = weighIns.find((w) => w.measured_at.startsWith(photoDate));
    const matchedMeas = measurements.find((m) => m.measured_at.startsWith(photoDate));

    const newPhoto: ProgressPhoto = {
      id: `photo-${Date.now()}`,
      captured_at: photoDate,
      photo_type: photoType,
      image_data_url: imageDataUrl,
      associated_weight_kg: matchedWeighIn?.weight_kg,
      associated_waist_cm: matchedMeas?.waist_cm,
      notes: notes.trim() || undefined,
      stage_tag: stageTag,
      is_reference_image: isReference,
    };

    onAddPhoto(newPhoto);
    setIsUploadOpen(false);
    setImageDataUrl('');
    setNotes('');
  };

  // Selected comparison photos
  const photoA = photos.find((p) => p.id === photoAId) || photos[0];
  const photoB = photos.find((p) => p.id === photoBId) || photos[1] || photos[0];

  const daysDifference =
    photoA && photoB
      ? Math.round(
          Math.abs(new Date(photoB.captured_at).getTime() - new Date(photoA.captured_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const realPhotos = photos.filter((p) => !p.is_reference_image);
  const referencePhotos = photos.filter((p) => p.is_reference_image);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Fotografías de Progreso Físico</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Galería 100% privada con almacenamiento en tu navegador. Comparación antes/después con peso y cintura asociados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {realPhotos.length >= 2 && (
            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-colors"
            >
              <SplitSquareVertical className="w-4 h-4 text-cyan-400" />
              <span>Comparar Fechas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-sm shadow-emerald-500/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Añadir Fotografía</span>
          </button>
        </div>
      </div>

      {/* Privacy Callout */}
      <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Privacidad de grado médico:</strong> Tus imágenes no se suben a servidores remotos ni entrenan modelos de IA. Residen exclusivamente en el almacenamiento local seguro de tu dispositivo.
          </span>
        </div>
      </div>

      {/* Photos Grid */}
      {realPhotos.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <Camera className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No tienes fotografías registradas todavía</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Sube fotos frontales, laterales o de espalda en las mismas condiciones de luz y postura para evaluar tu recomposición corporal.
          </p>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Primera Foto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {realPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="aspect-3/4 w-full bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                <img
                  src={photo.image_data_url}
                  alt={`Progreso ${photo.photo_type} - ${photo.captured_at}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-xs text-white border border-white/10">
                  {photo.photo_type}
                </span>

                <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/80 text-zinc-950">
                  {photo.stage_tag}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar esta fotografía de forma permanente?')) {
                      onDeletePhoto(photo.id);
                    }
                  }}
                  aria-label="Eliminar foto"
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-zinc-300 font-mono text-[11px]">
                  <span>{photo.captured_at}</span>
                  {photo.associated_weight_kg && (
                    <span className="text-cyan-400 font-bold">{photo.associated_weight_kg} kg</span>
                  )}
                </div>

                {photo.associated_waist_cm && (
                  <div className="text-[11px] text-amber-400 font-mono">
                    Cintura: {photo.associated_waist_cm} cm
                  </div>
                )}

                {photo.notes && (
                  <p className="text-[11px] text-zinc-400 italic line-clamp-1">{photo.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Target Reference Images Section */}
      {referencePhotos.length > 0 && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Referencia Visual Objetivo (Motivacional)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Separada explícitamente de tus fotos reales. Representa un arquetipo visual deseado, no una predicción médica.
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {referencePhotos.map((refPhoto) => (
              <div key={refPhoto.id} className="relative w-40 h-52 shrink-0 rounded-xl overflow-hidden border border-purple-500/30">
                <img src={refPhoto.image_data_url} alt="Referencia visual" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onDeletePhoto(refPhoto.id)}
                  aria-label="Eliminar imagen de referencia"
                  className="absolute top-2 right-2 p-1 rounded bg-black/60 text-white hover:bg-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Subir Fotografía de Progreso"
        subtitle="Almacenamiento privado local. Asocia automáticamente tu peso y cintura de la fecha seleccionada."
        maxWidth="md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {uploadError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Seleccionar archivo desde el dispositivo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-zinc-950 hover:file:bg-emerald-400 cursor-pointer"
              required
            />
          </div>

          {imageDataUrl && (
            <div className="aspect-3/4 max-h-56 mx-auto rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 flex items-center justify-center">
              <img src={imageDataUrl} alt="Vista previa" className="h-full w-auto object-contain" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="photo-type" className="block text-xs font-medium text-zinc-300 mb-1">Ángulo de fotografía</label>
              <select
                id="photo-type"
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value as PhotoType)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
              >
                <option value="frontal">Frontal</option>
                <option value="lateral">Lateral</option>
                <option value="espalda">Espalda</option>
                <option value="otra">Otra</option>
              </select>
            </div>

            <div>
              <label htmlFor="photo-date" className="block text-xs font-medium text-zinc-300 mb-1">Fecha de la foto</label>
              <input
                id="photo-date"
                type="date"
                value={photoDate}
                onChange={(e) => setPhotoDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="photo-stage" className="block text-xs font-medium text-zinc-300 mb-1">Etapa</label>
              <select
                id="photo-stage"
                value={stageTag}
                onChange={(e) => setStageTag(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
              >
                <option value="inicio">Inicio del plan</option>
                <option value="seguimiento">Seguimiento periódico</option>
                <option value="meta_visual">Meta visual / Referencia</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="ref-check"
                type="checkbox"
                checked={isReference}
                onChange={(e) => setIsReference(e.target.checked)}
                className="w-4 h-4 rounded text-purple-500 bg-zinc-950 border-zinc-700"
              />
              <label htmlFor="ref-check" className="text-xs text-zinc-300 cursor-pointer">
                Imagen objetivo motivacional
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="photo-notes" className="block text-xs font-medium text-zinc-300 mb-1">Notas de la captura</label>
            <input
              id="photo-notes"
              type="text"
              placeholder="Ej: luz natural matutina en ayunas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs"
            >
              Guardar en Galería
            </button>
          </div>
        </form>
      </Modal>

      {/* SIDE-BY-SIDE COMPARISON MODAL */}
      <Modal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        title="Comparador Visual Lado a Lado"
        subtitle={`Diferencia temporal entre imágenes: ${daysDifference} días`}
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Photo A Selector */}
            <div className="space-y-2">
              <label htmlFor="compare-photo-a" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Foto Anterior (A)</label>
              <select
                id="compare-photo-a"
                value={photoAId}
                onChange={(e) => setPhotoAId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                {realPhotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.captured_at} ({p.photo_type} - {p.associated_weight_kg || '?'}kg)
                  </option>
                ))}
              </select>

              {photoA && (
                <div className="aspect-3/4 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 relative">
                  <img src={photoA.image_data_url} alt="Foto A" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs font-mono text-white">
                    <div>{photoA.captured_at}</div>
                    <div className="text-cyan-400 font-bold">{photoA.associated_weight_kg} kg &bull; {photoA.associated_waist_cm} cm</div>
                  </div>
                </div>
              )}
            </div>

            {/* Photo B Selector */}
            <div className="space-y-2">
              <label htmlFor="compare-photo-b" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Foto Reciente (B)</label>
              <select
                id="compare-photo-b"
                value={photoBId}
                onChange={(e) => setPhotoBId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                {realPhotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.captured_at} ({p.photo_type} - {p.associated_weight_kg || '?'}kg)
                  </option>
                ))}
              </select>

              {photoB && (
                <div className="aspect-3/4 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 relative">
                  <img src={photoB.image_data_url} alt="Foto B" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs font-mono text-white">
                    <div>{photoB.captured_at}</div>
                    <div className="text-emerald-400 font-bold">{photoB.associated_weight_kg} kg &bull; {photoB.associated_waist_cm} cm</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delta Comparison Bar */}
          {photoA && photoB && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-around text-center text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Días transcurridos</span>
                <span className="text-white font-bold">{daysDifference} días</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Diferencia de peso</span>
                <span className="text-cyan-400 font-bold">
                  {photoA.associated_weight_kg && photoB.associated_weight_kg
                    ? `${(photoB.associated_weight_kg - photoA.associated_weight_kg).toFixed(1)} kg`
                    : '--'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Diferencia de cintura</span>
                <span className="text-amber-400 font-bold">
                  {photoA.associated_waist_cm && photoB.associated_waist_cm
                    ? `${(photoB.associated_waist_cm - photoA.associated_waist_cm).toFixed(1)} cm`
                    : '--'}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
