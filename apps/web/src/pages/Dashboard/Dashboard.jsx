import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/auth-context';
import Modal from '../../components/Modal/Modal';
import styles from './Dashboard.module.css';
import Header from '../../components/Header/Header';
import CategorySection from '../../components/CategorySection/CategorySection';
import ExpenseSection from '../../components/ExpenseSection/ExpenseSection';
import WideButton from '../../components/WideButton/WideButton';
import ExpenseForm from '../../components/ExpenseForm/ExpenseForm';
import ExpenseDetails from '../../components/ExpenseDetails/ExpenseDetails';
import CategoryForm from '../../components/CategoryForm/CategoryForm';
import CategoryDetails from '../../components/CategoryDetails/CategoryDetails';
import FamilyPanel from '../../components/FamilyPanel/FamilyPanel';
import Footer from '../../components/Footer/Footer';
import api from '../../services/api';

function DashboardAccount() {
  const { user } = useContext(AuthContext);
  const can = permission => user.permissions.includes(permission);
  const canView = can('VIEW');
  const [summary, setSummary] = useState({ received: '0.00', paid: '0.00', balance: '0.00' });
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [allCategories, setAllCategories] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [defaultType, setDefaultType] = useState('EXPENSE');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  function refresh() { setLoading(true); setRefreshVersion(value => value + 1); }
  useEffect(() => {
    if (!canView) return;
    let active = true;
    Promise.all([api.get('/dashboard/summary'), api.get('/categories'), api.get('/dashboard/expenses-by-category'), api.get('/entries')])
      .then(([totals, categories, categoryValues, entries]) => {
        if (!active) return;
        setSummary(totals.data); setAllCategories(categories.data); setCategoryTotals(categoryValues.data); setExpenses(entries.data); setError('');
      })
      .catch(() => { if (active) setError('Não foi possível atualizar seus dados. Tente novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshVersion, canView]);
  function openEntry(entry) { setSelectedExpense({ ...entry, category: allCategories.find(value => value.id === entry.categoryId) }); }
  function createEntry(type) { setExpenseToEdit(null); setDefaultType(type); setExpenseFormOpen(true); }
  function entrySaved() { setExpenseFormOpen(false); refresh(); }
  function categorySaved() { setCategoryFormOpen(false); setCategoryToEdit(null); refresh(); }
  return <><main className={styles.dashboardContent}>
    <Header summary={summary} showSummary={canView} />
    <FamilyPanel />
    {!canView ? <p>Seu responsável ainda não liberou acesso às funcionalidades financeiras.</p> : <>
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={refresh}>Tentar novamente</button></div>}
      <div className={styles.dashboardSections}>
        <CategorySection allCategories={allCategories} categoryTotals={categoryTotals} loading={loading} canCreate={can('CREATE')}
          onAddClick={() => { setCategoryToEdit(null); setCategoryFormOpen(true); }} onCategoryClick={setSelectedCategory} />
        <ExpenseSection onExpenseClick={openEntry} categories={allCategories} expenses={expenses} loading={loading} />
      </div>
      {can('CREATE') && <div className={styles.entryActions}>
        <WideButton text="Criar Despesa +" onClick={() => createEntry('EXPENSE')} /><WideButton text="Criar Ganho +" onClick={() => createEntry('INCOME')} />
      </div>}
      <Modal isOpen={expenseFormOpen} onClose={() => setExpenseFormOpen(false)}>
        <ExpenseForm onClose={() => setExpenseFormOpen(false)} onExpenseAdded={entrySaved} expenseToEdit={expenseToEdit} defaultType={defaultType} />
      </Modal>
      <Modal isOpen={!!selectedExpense} onClose={() => setSelectedExpense(null)}>
        <ExpenseDetails expense={selectedExpense} onClose={() => setSelectedExpense(null)} onExpenseDeleted={() => { setSelectedExpense(null); refresh(); }}
          canEdit={can('EDIT')} canDelete={can('DELETE')} canAttach={can('ATTACH')}
          onEdit={entry => { setExpenseToEdit(entry); setSelectedExpense(null); setExpenseFormOpen(true); }} />
      </Modal>
      <Modal isOpen={categoryFormOpen} onClose={() => setCategoryFormOpen(false)}>
        <CategoryForm onClose={() => setCategoryFormOpen(false)} onCategoryAdded={categorySaved} categoryToEdit={categoryToEdit} />
      </Modal>
      <Modal isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)}>
        <CategoryDetails category={selectedCategory} canEdit={can('EDIT')} canDelete={can('DELETE')}
          onEdit={category => { setCategoryToEdit(category); setSelectedCategory(null); setCategoryFormOpen(true); }}
          onClose={() => setSelectedCategory(null)} onDeleteSuccess={refresh} />
      </Modal>
    </>}
  </main><Footer /></>;
}
export default function Dashboard() {
  const { accountId } = useContext(AuthContext);
  return <DashboardAccount key={accountId || 'self'} />;
}
