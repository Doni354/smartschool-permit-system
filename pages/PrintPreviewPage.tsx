import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PrintTemplate } from '../components/PrintTemplate';
import { StudentPermit, DEMO_SCHOOLS } from '../types';
import { getPermitById } from '../services/permitService';
import { Loader2 } from 'lucide-react';

export const PrintPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentPermit | null>(null);
  const [school, setSchool] = useState(DEMO_SCHOOLS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (id) {
          const permit = await getPermitById(id);
          if (permit) {
            setData(permit);
            const foundSchool = DEMO_SCHOOLS.find(s => s.id === permit.schoolId);
            if (foundSchool) setSchool(foundSchool);
            setLoading(false);
            return;
          }
        }

        // Fallback to localStorage
        const storedData = localStorage.getItem('printData');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          setData(parsed);
          const foundSchool = DEMO_SCHOOLS.find(s => s.id === parsed.schoolId);
          if (foundSchool) setSchool(foundSchool);
        }
      } catch (e) {
        console.error('Failed to load print data', e);
      }
      setLoading(false);
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 flex-col gap-3">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p>Memuat data cetak...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-500">Tidak ada data untuk dicetak.</div>
    );
  }

  return (
    <div className="print:p-0">
      <div className="p-0 print:p-0">
        <PrintTemplate data={data} school={school} />
      </div>
    </div>
  );
};
