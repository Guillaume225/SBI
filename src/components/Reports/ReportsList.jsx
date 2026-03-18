import { Link } from 'react-router-dom';
import {
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaChartLine,
  FaLayerGroup,
  FaBook,
  FaUsers,
  FaProjectDiagram,
} from 'react-icons/fa';

const iconMap = {
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaChartLine,
  FaLayerGroup,
  FaBook,
  FaUsers,
  FaProjectDiagram,
};

const categoryLabels = {
  financial: 'États financiers',
  auxiliary: 'Analyses auxiliaires',
  analytical: 'Analyses analytiques',
};

export default function ReportsList({ reports = [] }) {
  // Grouper par catégorie
  const grouped = reports.reduce((acc, report) => {
    const cat = report.category || 'financial';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(report);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(grouped).map(([category, categoryReports]) => (
        <div key={category} className="mb-4">
          <h6 className="text-muted text-uppercase small fw-bold mb-3">
            {categoryLabels[category] || category}
          </h6>
          <div className="row g-3">
            {categoryReports.map((report) => {
              const Icon = iconMap[report.icon] || FaChartLine;
              return (
                <div key={report.id} className="col-md-6 col-lg-4">
                  <Link to={`/reports/${report.id}`} className="report-card">
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className="d-flex align-items-center justify-content-center rounded"
                        style={{
                          width: 44,
                          height: 44,
                          backgroundColor: 'rgba(72, 132, 189, 0.12)',
                          color: '#4884BD',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <h6 className="mb-1 fw-semibold">{report.name}</h6>
                        <p className="text-muted small mb-0">{report.description}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
