import { useState, useEffect } from 'react';
import useSchemaStore from '../../store/schemaStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import {
  // FaRegEdit,
  FaRegTrashAlt,
  FaRegCheckSquare,
  FaRegWindowClose,
} from 'react-icons/fa';
import { ColumnSchema } from '../../Types.js';

export default function TableNodeColumn({
  column,
  id,
}: {
  column: ColumnSchema;
  id: string;
}) {
  const { schemaStore, setSchemaStore, deleteColumnSchema } = useSchemaStore((state) => state);
  const { setEditRefMode } = useSettingsStore((state:any) => state);
  const [mode, setMode] = useState('default');
  const newColumn = JSON.parse(JSON.stringify(column));
  const [columnData, setColumnData] = useState<ColumnSchema>({ ...newColumn });
  const [removingFK, setRemovingFK] = useState(false);

  useEffect(() => {
    setColumnData({ ...newColumn });
  }, [column]);

  useEffect(() => {
    if (removingFK) {
      removeFK();
      setRemovingFK(false);
    }
  }, [removingFK]); // Dependency array includes columnData

  const removeFK = async () => {
    const currentSchema = { ...schemaStore };
    const tableName = columnData.TableName;
    const constraintName = columnData.References.length > 0 ? columnData.References[0].constraintName : '';

    currentSchema[columnData.TableName][columnData.field_name] = {
      ...columnData,
      // References was updated by AddReference modal, this avoids that change being overwritten
      References: currentSchema[columnData.TableName][columnData.field_name].References,
    };
    const dbId = window.location.href.replace(/.*edit\//, '');
    await fetch(import.meta.env.VITE_API_URL + `/api/sql/postgres/removeForeignKey`, {
      method:'DELETE',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer ' + localStorage.getItem('token'),
        'Accept-Version': 'genezio-webapp/0.3.0',
        'Db-Id': dbId as string
    },
      body:JSON.stringify({tableName,  constraintName})
    })

    setSchemaStore(currentSchema);
    setMode('default');
  };

  const onDelete = async () => {
    try {
      const tableRef = columnData.TableName;
      const colRef = columnData.field_name;
      const constraintName =
        columnData.References.length > 0 ? columnData.References[0].constraintName : '';

      // console.log('schemaStore[tableRef][colRef].References[0].isDestination: ', schemaStore[tableRef][colRef].References[0].isDestination)

      if (
        columnData.References.length > 0 &&
        schemaStore[tableRef][colRef].References[0].IsDestination === true
      ) {
        window.alert(
          `Cannot delete column: ${colRef} because it is being used in a Foreign Key constraint`
        );
        console.error(
          `Cannot delete column: ${colRef} because it is being used in a Foreign Key constraint`
        );
        return;
      }

      const dbId = window.location.href.replace(/.*edit\//, '');
      await fetch(import.meta.env.VITE_API_URL + `/api/sql/postgres/deleteColumn`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token'),
          'Accept-Version': 'genezio-webapp/0.3.0',
          'Db-Id': dbId as string
        },
        body: JSON.stringify({
          tableName: tableRef,
          columnName: colRef,
          constraintName: constraintName,
        }),
      })
        .then(() => {
          // To clean up the references of Primary keys that were being used in foreign keys
          for (const tableName in schemaStore) {
            const tableData = schemaStore[tableName];

            for (const columnName in tableData) {
              const columnData = tableData[columnName];

              if (columnData.IsPrimaryKey === true && columnData.References.length > 0) {
                const references = columnData.References;

                for (let i = references.length - 1; i >= 0; i--) {
                  const element = references[i];

                  if (
                    element.IsDestination === true &&
                    element.ReferencesPropertyName === colRef &&
                    element.ReferencesTableName === tableRef
                  ) {
                    references.splice(i, 1);
                    return;
                  }
                }
              }
            }
          }
        })
        .then(() => {
          deleteColumnSchema(tableRef, colRef);
        })
        .catch((err) => {
          window.alert(err);
          console.error(err);
        });
      return;
    } catch (err) {
      window.alert(err);
      console.error(err);
    }
  };

  const openAddReferenceModal = () => {
    // document.querySelector('#mySideNav').style.width = '400px';
    // document.querySelector('#main').style.marginRight = '400px';
    setEditRefMode(true, columnData.TableName, columnData.Name);
  };

  return (
    <>
      {/* TODO: SEE ABOUT DELETING KEY ATTRIBUTE AND ID ATTRIBUTES */}
      <tr key={column.field_name} id={column.field_name} className="dark:text-[#f8f4eb] ">
        <td className="dark:text-[#f8f4eb]" id={`${id}-field_name`}>
          {columnData.field_name}
        </td>
        <td className="dark:text-[#f8f4eb]" id={`${id}-data_type`}>
          {columnData.data_type}
        </td>
        <td className="dark:text-[#f8f4eb]" id={`${id}-additional_constraints`}>
          {columnData.additional_constraints}
        </td>
        <td className="dark:text-[#f8f4eb]" id={`${id}-IsPrimaryKey`}>
          {`${columnData.IsPrimaryKey}`}
        </td>
        <td className="dark:text-[#f8f4eb]" id={`${id}-IsForeignKey`}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (Object.keys(schemaStore).length <= 1) {
                return window.alert(
                  'Must have more than one table to create foreign key constraints'
                );
              }

              if (columnData.IsForeignKey) {
                if (!confirm('Are you sure you want to remove the foreign key constraint?')) {
                  return;
                }
                setColumnData((prevData) => {
                  return {
                    ...prevData,
                    IsForeignKey: !prevData.IsForeignKey,
                  };
                });
                setRemovingFK(true);
              } else {
                openAddReferenceModal();
              }
          }}
          >{`${columnData.IsForeignKey}`}</a>
        </td>
        <td className="dark:text-[#f8f4eb]">
          {mode === 'delete' ? (
            <button
              id={`${id}-confirmBtn`}
              onClick={(e) => {
                e.preventDefault();
                onDelete();
                setMode('default');
              }}
              className="transition-colors duration-500 hover:text-[#618fa7] dark:text-[#fbf3de] dark:hover:text-[#618fa7]"
            >
              <FaRegCheckSquare size={17} />
            </button>
          ) : null}
        </td>
        <td className="transition-colors duration-500 hover:text-[#618fa7] dark:text-[#fbf3de] dark:hover:text-[#618fa7]">
          {mode === 'delete' ? (
            <button id={`${id}-cancelBtn`} onClick={() => setMode('default')}>
              <FaRegWindowClose size={17} />
            </button>
          ) : (
            <button id={`${id}-deleteBtn`} onClick={() => setMode('delete')}>
              <FaRegTrashAlt size={17} />
            </button>
          )}
        </td>
      </tr>
    </>
  );
}
