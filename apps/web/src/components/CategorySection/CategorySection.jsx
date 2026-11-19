import styles from './CategorySection.module.css';
import CategoryCard from '../CategoryCard/CategoryCard';
import { MdAdd } from 'react-icons/md';

function CategorySection({ allCategories = [], categoryTotals = [], loading, onAddClick, onCategoryClick, canCreate = true }) {

    return (
        <section className={styles.categorySection}>
            <div className={styles.categorySectionContent}>
                <h2>Despesas por categoria</h2>
                <p>Inclui lançamentos pendentes.</p>
                {!loading && allCategories.length === 0 && <p className={styles.emptyMessage}>Nenhuma categoria registrada.</p>}
                <div className={styles.containerCards}>
                    {loading ? (
                        <p>Carregando...</p>
                    ) : allCategories.length > 0 ? (
                        allCategories.map((category) => {
                            // Para cada categoria da lista completa, procuramos seu total correspondente.
                            const totalInfo = categoryTotals.find(total => total.categoryId === category.id);
                            const valor = Number(totalInfo?.total || 0);

                            return (
                                <CategoryCard
                                    key={category.id}
                                    nome={category.name}
                                    valor={valor}
                                    onClick={() => onCategoryClick(category)}
                                />
                            );
                        })
                    ) : null}

                    {canCreate && <button className={styles.categoryCardAddButton} onClick={onAddClick} aria-label="Adicionar categoria" title="Adicionar categoria">
                                <MdAdd aria-hidden="true" />
                            </button>}
                </div>
            </div>
        </section>
    )
}

export default CategorySection;
