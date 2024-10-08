//-----IMPORTED FILES/MODULES
import useSchemaStore from '../../store/schemaStore.js';

//-----TYPES
type EachRow = {
  [key: string | number]: string | number | boolean | null;
};

type RowInputProps = {
  tableName: string | undefined;
  currentTable: EachRow[];
  handleRowChange: (index: number, value: string | boolean) => void;
  secondaryColumnNames: string[];
};

//-----MODAL for new row inputs
export default function RowInput({
  tableName,
  currentTable,
  handleRowChange,
  secondaryColumnNames,
}: RowInputProps) {
  const { schemaStore } = useSchemaStore((state:any) => state);

  const arrOfDataType = schemaStore[tableName as string];
  const columns: JSX.Element[] = [];
  const inputs: JSX.Element[] = [];
  let columnNames: string[];
  let maxConstraintNameLength: number;
  maxConstraintNameLength = 63; //Postgres

  //adding first row of data current table = [], with length=0, and _prototype
  //when it runs through the function it ends up being [{with properties}]

  // the following ternary checks to see if currentTable exists and if not defaults it to an empty array.
  // This helps stabilize the data structure in the case of creating fresh tables (NOT loading/connecting to a database)
  currentTable = currentTable ? currentTable : [];

  // If current table is EMPTY, we are going to use secondaryColumnNames we got from schemaStore in DataInputModal
  if (!currentTable.length) {
    columnNames = secondaryColumnNames;
  } else {
    columnNames = Object.keys(currentTable[0]);
  }
  columnNames.forEach((each, i) => {
    columns.push(
      <label
        key={i + each}
        className=" m-2 text-center text-slate-900 dark:text-[#f8f4eb]"
      >
        {each}
      </label>
    );
  });
  for (let i = 0; i < columns.length; i++) {
    inputs.push(
      <input
        key={i}
        className="m-2"
        type="text"
        placeholder={arrOfDataType[columnNames[i]].data_type}
        maxLength={maxConstraintNameLength}
        onChange={(e) => {
          handleRowChange(i, e.target.value.trim());
        }}
      />
    );
  }

  return (
    <div className="column-input">
      <div>{columns}</div>
      <div>{inputs}</div>
    </div>
  );
}
