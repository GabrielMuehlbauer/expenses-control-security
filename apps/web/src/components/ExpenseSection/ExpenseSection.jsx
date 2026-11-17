import { civilDate } from '../../utils/format';
import { useState } from 'react';
import styles from './ExpenseSection.module.css';
import ExpenseRow from '../ExpenseRow/ExpenseRow';

function ExpenseSection({ onExpenseClick, categories = [], expenses = [], loading }) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterMinValue, setFilterMinValue] = useState("");
    const [filterType, setFilterType] = useState('');

    const activeFiltersCount = [filterStatus, filterDate, filterCategory, filterMinValue, filterType].filter(Boolean).length;

    const filteredExpenses = expenses.filter(expense => {
        const matchStatus = filterStatus ? expense.status === filterStatus : true;
        const matchDate = filterDate ? expense.date.startsWith(filterDate) : true;
        const matchCategory = filterCategory ? String(expense.categoryId) === String(filterCategory) : true;
        const matchValue = filterMinValue ? Number(expense.amount) >= Number(filterMinValue) : true;
        return matchStatus && matchDate && matchCategory && matchValue && (!filterType || expense.type === filterType);
    });

    const clearFilters = () => {
        setFilterStatus("");
        setFilterDate("");
        setFilterCategory("");
        setFilterMinValue("");
        setFilterType('');
        // Opcional: Se quiser que feche ao limpar, descomente a linha abaixo
        // setIsFilterOpen(false);
    };

    return (
        <section className={styles.expenseSection}>
            <div className={styles.expenseSectionContent}>

                {/* CABEÇALHO COM POSITION RELATIVE */}
                <div className={styles.expenseSectionHeader}>
                    <div>
                        <h2>Histórico financeiro</h2>
                        <span className={styles.expenseCount}>
                            Total: {filteredExpenses.length}
                        </span>
                    </div>

                    {/* Botão para abrir o Filtro */}
                    <div className={styles.filterButton} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                        <span className="material-symbols-outlined">
                            tune
                        </span>
                        {activeFiltersCount > 0 && (
                            <span className={styles.filterBadge}>{activeFiltersCount}</span>
                        )}
                    </div>

                    {/* A JANELA FLUTUANTE (DROPDOWN) */}
                    {isFilterOpen && (
                        <div className={styles.filterDropdown}>
                            {/* Botão de Fechar no topo direito */}
                            <button className={styles.closeFilterButton} onClick={() => setIsFilterOpen(false)}>
                                <p>×</p>
                            </button>

                            <select className={styles.filterInput} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">Status...</option>
                                <option value="PAGA">Pagos / recebidos</option>
                                <option value="PENDENTE">Pendentes</option>
                            </select>

                            <select aria-label="Filtrar tipo de lançamento" className={styles.filterInput} value={filterType} onChange={event => setFilterType(event.target.value)}><option value="">Receitas e despesas</option><option value="EXPENSE">Despesas</option><option value="INCOME">Receitas</option></select>
                            <select className={styles.filterInput} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                <option value="">Categoria...</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>

                            <input
                                className={styles.filterInput}
                                type="date"
                                title="Data Específica"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />

                            <input
                                className={styles.filterInput}
                                type="number"
                                placeholder="Valor Mínimo (Ex: 100)"
                                value={filterMinValue}
                                onChange={(e) => setFilterMinValue(e.target.value)}
                            />

                            {/* Botão de limpar (aparece se houver filtro ativo) */}
                            {activeFiltersCount > 0 && (
                                <button className={styles.clearButton} onClick={clearFilters}>
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* LISTAGEM DAS DESPESAS */}
                <div className={styles.containerRows}>
                    {loading ? (
                        <p style={{ color: 'var(--light-yellowish-green)' }}>Carregando...</p>
                    ) : filteredExpenses.length > 0 ? (
                        filteredExpenses.map((expense) => {
                            const categoryObject = categories.find(cat => cat.id === expense.categoryId);
                            return (
                                <ExpenseRow
                                    key={expense.id}
                                    title={expense.title}
                                    category={categoryObject || { name: 'Sem Categoria' }}
                                    date={civilDate(expense.date)}
                                    description={expense.description}
                                    amount={expense.amount}
                                    status={expense.status}
                                    type={expense.type}
                                    onClick={() => onExpenseClick(expense)}
                                />
                            )
                        })
                    ) : (
                        <p style={{ color: 'var(--light-yellowish-green)' }}>Nenhuma despesa bate com esses filtros.</p>
                    )}
                </div>
            </div>
        </section>
    )
}

export default ExpenseSection;
