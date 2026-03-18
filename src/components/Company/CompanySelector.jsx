import { useCompany } from '../../contexts/CompanyContext';
import { FaBuilding } from 'react-icons/fa';

export default function CompanySelector() {
  const { companies, selectedCompany, selectCompany, fiscalYear, setFiscalYear } = useCompany();

  return (
    <div className="d-flex align-items-center gap-2">
      <FaBuilding className="text-muted" />
      <select
        className="form-select form-select-sm"
        style={{ width: '200px' }}
        value={selectedCompany?.id || ''}
        onChange={(e) => {
          const company = companies.find((c) => String(c.id) === e.target.value);
          if (company) selectCompany(company);
        }}
      >
        {companies.length === 0 && (
          <option value="">Aucune société</option>
        )}
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} — {c.name}
          </option>
        ))}
      </select>

      <select
        className="form-select form-select-sm"
        style={{ width: '100px' }}
        value={fiscalYear}
        onChange={(e) => setFiscalYear(parseInt(e.target.value))}
      >
        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
