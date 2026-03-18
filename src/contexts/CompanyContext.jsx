import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/societes/');
      // Ne garder que les sociétés actives pour le sélecteur
      const active = response.data.filter((s) => s.is_active !== false);
      setCompanies(active);
      // Sélectionner la première si rien n'est encore choisi
      if (active.length > 0 && !selectedCompany) {
        setSelectedCompany(active[0]);
      }
    } catch (err) {
      console.error('Erreur chargement sociétés:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    localStorage.setItem('sbi_selected_company', JSON.stringify(company));
  };

  // Restaurer la sélection sauvegardée
  useEffect(() => {
    const saved = localStorage.getItem('sbi_selected_company');
    if (saved) {
      try {
        setSelectedCompany(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Charger les sociétés au montage
  useEffect(() => {
    fetchCompanies();
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        selectCompany,
        fiscalYear,
        setFiscalYear,
        fetchCompanies,
        loading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompany doit être utilisé dans un CompanyProvider');
  return context;
}
