import React from 'react';
import { SchoolProfile, StudentPermit, PermitType } from '../types';

interface PrintTemplateProps {
  data: StudentPermit | null;
  school: SchoolProfile;
  className?: string;
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({ data, school, className }) => {
  if (!data) return null;

  /* Safe date parsing */
  const dateObj = new Date(data.timestamp);
  const isValidDate = !isNaN(dateObj.getTime());
  
  const dateStr = isValidDate ? dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : '-';

  const timeStr = isValidDate ? dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }) : '-';

  const isLate = data.type === PermitType.LATE_ENTRY;
  const title = isLate ? 'IZIN MASUK' : 'IZIN KELUAR';
  const nomorSurat = `${isLate ? 'IM' : 'IK'}/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  return (
    <div id="print-area" className={`text-black font-receipt ${className || ''}`} style={{ width: '100%', maxWidth: '100%', padding: '0', fontSize: '12pt', lineHeight: '0.8' }}>
      
      {/* HEADER */}
      <div className="text-center border-b border-black border-dashed pb-[2px] mb-[4px] pt-1">
    <h1 className="font-bold uppercase text-[17px] leading-[1]">
      {school.name}
    </h1>
    <p className="text-[12.5px] leading-[1]">
      {school.address}
    </p>
  </div>

      {/* TITILE */}
      <div className="text-center mb-[6px]">
    <h2 className="font-bold text-[20px] border-b border-black inline-block leading-[1]">
      {title}
    </h2>
    <p className="text-[15px] leading-[1] mt-[2px]">
      NO:{nomorSurat}
    </p>
  </div>
      {/* CONTENT */}
      <div className="flex flex-col gap-1 mb-1 text-[17.5px]">
        <div className="flex">
          <span className="w-[20mm]">Nama</span>
          <span className="font-bold">: {data.studentName}</span>
        </div>
        <div className="flex">
          <span className="w-[20mm]">Kelas</span>
          <span className="font-bold">: {data.className}</span>
        </div>
        <div className="flex">
          <span className="w-[20mm]">Tanggal</span>
          <span className="font-bold">: {dateStr}</span>
        </div>
        <div className="flex">
          <span className="w-[20mm]">Waktu</span>
          <span className="font-bold">: {timeStr} WIB</span>
        </div>
      </div>

      <div className="border-t border-b border-black border-dashed py-1 mb-2 text-[18px]">
        <p className="font-bold mb-1">{isLate ? 'Keterangan:' : 'Alasan:'}</p>
        <p className="italic leading-tight">"{data.reason}"</p>
        {!isLate && data.returnTimestamp && (
          <p className="mt-1 ">Kembali: {new Date(data.returnTimestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
        )}
      </div>

      <div className="mb-2 text-justify leading-tight ">
        {isLate 
          ? "Diizinkan masuk kelas." 
          : "Diizinkan meninggalkan sekolah."}
      </div>

      {/* SIGNATURES */}
      {isLate ? (
        /* Izin Masuk: 2 TTD */
        <div className="flex justify-between mt-2 text-[18px]">
          <div className="text-center w-1/2">
            <p className="mb-20 font-bold text-[18px]">An. KepSek</p>
            <p className="font-bold text-[12px] underline">{"_________________"}</p>
          </div>
          <div className="text-center w-1/2">
            <p className="mb-20 font-bold text-[18px]">Guru Piket</p>
            <p className="font-bold text-[12px] underline">{"_________________"}</p>
          </div>
        </div>
      ) : (
        /* Izin Keluar: 3 TTD — 2 atas, 1 bawah tengah */
        <div className="text-[18px]">
          {/* Baris atas: Guru Kelas/UKS (kiri) + Guru Piket (kanan) */}
          <div className="flex justify-between mt-2">
            <div className="text-center w-1/2">
              <p className="mb-20 font-bold text-[18px]">Guru Piket</p>
              <p className="font-bold text-[12px] underline">{"_________________"}</p>
            </div>
            <div className="text-center w-1/2">
              <p className="mb-20 font-bold text-[18px]">Guru Kelas/UKS</p>
              <p className="font-bold text-[12px] underline">{"_________________"}</p>
            </div>
          </div>
          {/* Baris bawah: An. KepSek — tengah */}
          <div className="flex justify-center mt-6">
            <div className="text-center w-1/2">
              <p className="mb-20 font-bold text-[18px]">An. KepSek</p>
              <p className="font-bold text-[12px] underline">{"_________________"}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};