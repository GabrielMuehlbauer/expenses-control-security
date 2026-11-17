function representation(record, collection) {
  const value = record.toJSON();
  value._links = ['GET', 'PUT', 'DELETE'].map((method, index) => ({ rel: ['self', 'update', 'delete'][index], method, href: `/api/${collection}/${value.id}` }));
  return value;
}
module.exports = representation;
